import { auth, firestore, storage } from './firebase';
import { Collections } from './firebase';

/**
 * Deletes a folder (list of files) from Firebase Storage.
 * Silently ignores errors for individual files in case some don't exist.
 */
const deleteStorageFolder = async (folderPath: string) => {
  try {
    const ref = storage().ref(folderPath);
    const result = await ref.listAll();
    const deletions = result.items.map((item) => item.delete().catch(() => {}));
    await Promise.all(deletions);
  } catch {
    // Folder may not exist — safe to ignore
  }
};

/**
 * Deletes a single Storage file silently.
 */
const deleteStorageFile = async (filePath: string) => {
  try {
    await storage().ref(filePath).delete();
  } catch {
    // File may not exist — safe to ignore
  }
};

/**
 * Deletes all messages inside a chat document, then the chat doc itself.
 * Handles chats with more than 500 messages by batching in chunks.
 */
const deleteChatAndMessages = async (chatId: string) => {
  const chatRef = firestore().collection(Collections.CHATS).doc(chatId);

  // Delete messages sub-collection in batches of 400
  let messagesSnapshot = await chatRef.collection(Collections.MESSAGES).limit(400).get();
  while (!messagesSnapshot.empty) {
    const batch = firestore().batch();
    messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    messagesSnapshot = await chatRef.collection(Collections.MESSAGES).limit(400).get();
  }

  // Delete typing sub-collection
  try {
    const typingSnap = await chatRef.collection('typing').limit(50).get();
    if (!typingSnap.empty) {
      const batch = firestore().batch();
      typingSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch {
    // Ignore
  }

  // Delete chat media from Storage: chats/{chatId}/media/
  await deleteStorageFolder(`chats/${chatId}/media`);

  // Delete chat document
  await chatRef.delete();
};

/**
 * Full account deletion:
 * 1. Deletes all chats the user participates in (and all their messages + media)
 * 2. Deletes all statuses posted by the user (Firestore + Storage)
 * 3. Deletes all status_views records by the user
 * 4. Deletes the user's Firestore profile doc
 * 5. Deletes the user's profile photo from Storage
 * 6. Deletes the Firebase Auth account
 */
export const deleteAccountAndAllData = async (): Promise<void> => {
  const user = auth().currentUser;
  if (!user) throw new Error('No authenticated user found.');

  const uid = user.uid;
  const phoneNumber = user.phoneNumber;

  // ─── 1. Delete all chats where this user is a participant ───────────────────
  if (phoneNumber) {
    const chatsSnapshot = await firestore()
      .collection(Collections.CHATS)
      .where('participants', 'array-contains', phoneNumber)
      .get();

    await Promise.all(chatsSnapshot.docs.map((doc) => deleteChatAndMessages(doc.id)));
  }

  // ─── 2. Delete all statuses created by this user ────────────────────────────
  const statusesSnapshot = await firestore()
    .collection('statuses')
    .where('userId', '==', uid)
    .get();

  if (!statusesSnapshot.empty) {
    const batch = firestore().batch();
    statusesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  // Delete status media from Storage: statuses/{uid}/
  await deleteStorageFolder(`statuses/${uid}`);

  // ─── 3. Delete status_views records by this user ────────────────────────────
  try {
    const viewsSnapshot = await firestore()
      .collection('status_views')
      .where('viewerUid', '==', uid)
      .get();

    if (!viewsSnapshot.empty) {
      const batch = firestore().batch();
      viewsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch {
    // Ignore permission issues on status_views
  }

  // ─── 4. Delete user Firestore profile doc ───────────────────────────────────
  await firestore().collection(Collections.USERS).doc(uid).delete();

  // ─── 5. Delete profile picture from Storage ──────────────────────────────────
  await deleteStorageFile(`profilePictures/${uid}.jpg`);

  // ─── 6. Delete Firebase Auth account (must be last) ─────────────────────────
  await user.delete();
};
