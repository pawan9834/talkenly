import * as Contacts from 'expo-contacts';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
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
    const user = auth().currentUser;
    if (!user) {
      console.warn('[Sync] User not authenticated, skipping Firestore check.');
      return;
    }

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
  const user = auth().currentUser;
  if (!user) {
    console.error('[Firestore] No authenticated user found for registration check.');
    return;
  }

  try {
    // deduplicate
    const uniquePhones = Array.from(new Set(normalizedPhones));
    if (uniquePhones.length === 0) return;

    console.log(`[Firestore] Checking registration for ${uniquePhones.length} contacts. Auth: ${user.uid}`);

    // Chunk into batches of 30 (Firestore IN limit)
    const chunks: string[][] = [];
    for (let i = 0; i < uniquePhones.length; i += 30) {
      chunks.push(uniquePhones.slice(i, i + 30));
    }

    const registeredPhones: string[] = [];
    const photoMap: Record<string, string> = {};
    const uidMap: Record<string, string> = {};

    // Process chunks sequentially to avoid overwhelming the network
    for (const chunk of chunks) {
      try {
        console.log(`[Firestore] Querying chunk of ${chunk.length} phones...`);
        const snapshot = await firestore()
          .collection('users')
          .where('phoneNumber', 'in', chunk)
          .get();
        
        console.log(`[Firestore] Chunk result: ${snapshot.size} users found.`);

        snapshot.forEach(doc => {
          const data = doc.data();
          const phone = data.phoneNumber;
          if (phone) {
            registeredPhones.push(phone);
            uidMap[phone] = doc.id;
            if (data.photoURL) {
              photoMap[phone] = data.photoURL;
            }
          }
        });
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (chunkError: any) {
        console.error('[Firestore] Chunk check failed:', chunkError);
        console.log('[Firestore] Failed chunk details:', JSON.stringify(chunk));
        // If we get permission denied here, it's very likely the 'allow list' 
        // rule is missing or restricted on the 'users' collection.
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
