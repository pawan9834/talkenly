import * as Contacts from "expo-contacts";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { DeviceEventEmitter } from "react-native";
import {
  saveContactsBatch,
  getContactCount,
  updateRegistrationStatus,
  getDb,
} from "./database";
import { normalizeIndianPhoneNumber } from "./phoneUtils";
import { CONFIG } from "./config";
let isSyncing = false;
export const syncContacts = async (force: boolean = false) => {
  if (isSyncing) {
    return;
  }
  isSyncing = true;
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return;
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });
    if (!data || data.length === 0) return;
    const formattedContacts = data
      .map((c) => {
        const rawPhone = c.phoneNumbers?.[0]?.number || "";
        const normPhone = normalizeIndianPhoneNumber(rawPhone);
        return {
          id: c.id,
          name: c.name || "Unknown",
          phoneNumber: rawPhone,
          normalizedPhone: normPhone,
          imageUri: null,
        };
      })
      .filter((c) => c.normalizedPhone !== null);
    await saveContactsBatch(formattedContacts);
    const user = auth().currentUser;
    if (!user) {
      return;
    }
    await checkFirestoreRegistration(
      formattedContacts.map((c) => c.normalizedPhone as string),
    );
  } catch (error) {
    console.error("[Sync] Failed:", error);
  } finally {
    isSyncing = false;
  }
};
export const checkFirestoreRegistration = async (
  normalizedPhones: string[],
) => {
  const user = auth().currentUser;
  if (!user) {
    console.error("[Sync] No authenticated user found for registration check.");
    return;
  }
  try {
    const uniquePhones = Array.from(new Set(normalizedPhones));
    if (uniquePhones.length === 0) return;
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/check-contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phones: uniquePhones }),
    });
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    const { registered } = await response.json();
    const registeredPhones: string[] = [];
    const photoMap: Record<string, string> = {};
    const uidMap: Record<string, string> = {};
    registered.forEach((reg: any) => {
      registeredPhones.push(reg.phoneNumber);
      uidMap[reg.phoneNumber] = reg.uid;
      if (reg.photoURL) {
        photoMap[reg.phoneNumber] = reg.photoURL;
      }
    });
    if (registeredPhones.length > 0) {
      await updateRegistrationStatus(registeredPhones, photoMap, uidMap);
    }
    DeviceEventEmitter.emit("contacts_synced");
  } catch (error) {
    console.error("[Sync] Registration check failed:", error);
  }
};
