import { auth, firestore, storage } from "./firebase";
import { Collections } from "./firebase";
const deleteStorageFolder = async (folderPath: string) => {
  try {
    const ref = storage().ref(folderPath);
    const result = await ref.listAll();
    const deletions = result.items.map((item) => item.delete().catch(() => {}));
    await Promise.all(deletions);
  } catch {}
};
const deleteStorageFile = async (filePath: string) => {
  try {
    await storage().ref(filePath).delete();
  } catch {}
};
const deleteChatAndMessages = async (chatId: string) => {
  const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
  let messagesSnapshot = await chatRef
    .collection(Collections.MESSAGES)
    .limit(400)
    .get();
  while (!messagesSnapshot.empty) {
    const batch = firestore().batch();
    messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    messagesSnapshot = await chatRef
      .collection(Collections.MESSAGES)
      .limit(400)
      .get();
  }
  try {
    const typingSnap = await chatRef.collection("typing").limit(50).get();
    if (!typingSnap.empty) {
      const batch = firestore().batch();
      typingSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch {}
  await deleteStorageFolder(`chats/${chatId}/media`);
  await chatRef.delete();
};
export const deleteAccountAndAllData = async (): Promise<void> => {
  const user = auth().currentUser;
  if (!user) throw new Error("No authenticated user found.");
  const uid = user.uid;
  const phoneNumber = user.phoneNumber;
  if (phoneNumber) {
    const chatsSnapshot = await firestore()
      .collection(Collections.CHATS)
      .where("participants", "array-contains", phoneNumber)
      .get();
    await Promise.all(
      chatsSnapshot.docs.map((doc) => deleteChatAndMessages(doc.id)),
    );
  }
  const statusesSnapshot = await firestore()
    .collection("statuses")
    .where("userId", "==", uid)
    .get();
  if (!statusesSnapshot.empty) {
    const batch = firestore().batch();
    statusesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await deleteStorageFolder(`statuses/${uid}`);
  try {
    const viewsSnapshot = await firestore()
      .collection("status_views")
      .where("viewerUid", "==", uid)
      .get();
    if (!viewsSnapshot.empty) {
      const batch = firestore().batch();
      viewsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch {}
  await firestore().collection(Collections.USERS).doc(uid).delete();
  await deleteStorageFile(`profilePictures/${uid}.jpg`);
  await user.delete();
};
