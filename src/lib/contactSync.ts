import * as Contacts from 'expo-contacts';
import firestore from '@react-native-firebase/firestore';
import { DeviceEventEmitter } from 'react-native';
import { saveContactsBatch, getContactCount, updateRegistrationStatus, getDb } from './database';
import { normalizeIndianPhoneNumber } from './phoneUtils';

let isSyncing = false;

/**
 * Synchronizes device contacts with local SQLite database and checks registration on Firestore.
 */
export const syncContacts = async (force: boolean = false) => {
  if (isSyncing) {
    console.log('[Sync] Sync already in progress, skipping...');
    return;
  }

  isSyncing = true;
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return;

    // 1. Fetch Device Contacts
    console.log('[Sync] Fetching device contacts...');
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    if (!data || data.length === 0) return;

    // 2. Normalize and Format
    const formattedContacts = data
      .map(c => {
        const rawPhone = c.phoneNumbers?.[0]?.number || '';
        const normPhone = normalizeIndianPhoneNumber(rawPhone);
        return {
          id: c.id,
          name: c.name || 'Unknown',
          phoneNumber: rawPhone,
          normalizedPhone: normPhone,
          imageUri: null,
        };
      })
      .filter(c => c.normalizedPhone !== null); // Keep only valid Indian numbers

    // 3. Save to Local SQLite
    await saveContactsBatch(formattedContacts);
    console.log(`[Sync] Locally saved/updated ${formattedContacts.length} contacts.`);

    // 4. Check Registration status in Firestore
    await checkFirestoreRegistration(formattedContacts.map(c => c.normalizedPhone as string));

  } catch (error) {
    console.error('[Sync] Failed:', error);
  } finally {
    isSyncing = false;
  }
};

/**
 * Checks Firestore in chunks of 30 to see which contacts are registered on Talkenly.
 */
export const checkFirestoreRegistration = async (normalizedPhones: string[]) => {
  try {
    // deduplicate
    const uniquePhones = Array.from(new Set(normalizedPhones));
    if (uniquePhones.length === 0) return;

    console.log(`[Firestore] Checking registration for ${uniquePhones.length} contacts...`);

    // Chunk into batches of 30 (Firestore IN limit)
    const chunks: string[][] = [];
    for (let i = 0; i < uniquePhones.length; i += 30) {
      chunks.push(uniquePhones.slice(i, i + 30));
    }

    const registeredPhones: string[] = [];
    const photoMap: Record<string, string> = {};
    const uidMap: Record<string, string> = {};

    // Process chunks sequentially to avoid overwhelming the network
    // and hitting Firestore rate limits for high contact counts
    for (const chunk of chunks) {
      try {
        const snapshot = await firestore().collection('users').where('phoneNumber', 'in', chunk).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          const phone = data.phoneNumber;
          if (phone) {
            registeredPhones.push(phone);
            uidMap[phone] = doc.id; // Correctly capture the UID
            if (data.photoURL) {
              photoMap[phone] = data.photoURL;
            }
          }
        });
        // Small delay between chunks to let the UI thread breathe
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (chunkError) {
        console.error('[Firestore] Chunk check failed:', chunkError);
      }
    }

    // Update SQLite with registered status, Firestore photos, and UIDs
    if (registeredPhones.length > 0) {
      await updateRegistrationStatus(registeredPhones, photoMap, uidMap);
    }

    console.log(`[Firestore] Found ${registeredPhones.length} registered users.`);
    // Notify UI that contacts have finished syncing
    DeviceEventEmitter.emit('contacts_synced');
  } catch (error) {
    console.error('[Firestore] Registration check failed:', error);
  }
};
