import firestore from '@react-native-firebase/firestore';
import { Collections, auth } from './firebase';

export interface ChatMessage {
  id: string;
  text: string;
  senderPhone: string;
  timestamp: any;
  status: 'sent' | 'delivered' | 'read';
}

/**
 * Generates a deterministic chat ID based on two phone numbers.
 * The order is always alphabetical to ensure both users derive the same ID.
 */
export const generateChatId = (phone1: string, phone2: string) => {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

/**
 * Sends a message to a specific chat.
 * Updates both the message sub-collection and the parent chat summary.
 */
export const sendMessage = async (chatId: string, senderPhone: string, text: string, participants: string[]) => {
  try {
    const timestamp = firestore.FieldValue.serverTimestamp();

    // 1. Add to messages sub-collection
    const msgRef = firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .doc();

    await msgRef.set({
      text,
      senderPhone,
      timestamp,
      status: 'sent',
    });

    // 2. Update parent chat doc for the Home screen list
    const recipientPhone = participants.find(p => p !== senderPhone);

    const updateData: any = {
      lastMessage: text,
      lastTime: timestamp,
      lastSender: senderPhone,
      participants: participants,
    };

    if (recipientPhone) {
      // Clean phone for field name compatibility
      const safePhone = recipientPhone.replace(/\+/g, '');
      updateData[`unreadCount_${safePhone}`] = firestore.FieldValue.increment(1);
    }

    await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .set(updateData, { merge: true });

    return true;
  } catch (error) {
    console.error('[ChatService] Send Failed:', error);
    return false;
  }
};

/**
 * Subscribes to real-time message updates for a chat.
 */
export const subscribeMessages = (chatId: string, onUpdate: (messages: ChatMessage[]) => void) => {
  return firestore()
    .collection(Collections.CHATS)
    .doc(chatId)
    .collection(Collections.MESSAGES)
    .orderBy('timestamp', 'asc')
    .onSnapshot(snapshot => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      onUpdate(messages);
    }, error => {
      console.error('[ChatService] Subscription Error:', error);
    });
};
/**
 * Deep diagnostic to identify permission-denied causes.
 */
export const runFirestoreDiagnostics = async (chatId: string) => {
  const user = auth().currentUser;
  let log = '─── FIRESTORE DIAGNOSTICS ───\n';
  log += `1. Auth State: ${user ? `UID: ${user.uid}, Phone: ${user.phoneNumber}` : 'NOT LOGGED IN'}\n`;
  
  try {
    log += '2. Testing Write to /diagnostics/test...\n';
    await firestore().collection('diagnostics').doc('test').set({ 
      timestamp: firestore.FieldValue.serverTimestamp(),
      userId: user?.uid 
    });
    log += '   ✅ Write Success\n';
  } catch (e: any) {
    log += `   ❌ Write Failed: ${e.message}\n`;
  }

  try {
    log += `3. Testing Read from /chats/${chatId}...\n`;
    const chatDoc = await firestore().collection(Collections.CHATS).doc(chatId).get();
    log += `   ✅ Read Success. Exists: ${chatDoc.exists}\n`;
  } catch (e: any) {
    log += `   ❌ Read Failed: ${e.message}\n`;
  }

  try {
    log += `4. Testing Sub-collection Read...\n`;
    const msgs = await firestore().collection(Collections.CHATS).doc(chatId).collection(Collections.MESSAGES).limit(1).get();
    log += `   ✅ Sub-collection Read Success. Docs: ${msgs.size}\n`;
  } catch (e: any) {
    log += `   ❌ Sub-collection Read Failed: ${e.message}\n`;
  }
  
  log += '─── END DIAGNOSTICS ───';
  return log;
};

/**
 * Marks all unread messages from the other user as 'read' in a specific chat.
 */
export const markMessagesAsRead = async (chatId: string, myPhone: string) => {
  if (!chatId || !myPhone) return;
  try {
    const unreadSnapshot = await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .where('senderPhone', '!=', myPhone)
      .get();

    if (unreadSnapshot.empty) return;

    const batch = firestore().batch();

    unreadSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'read') {
        batch.update(doc.ref, { status: 'read' });
      }
    });

    // Also reset the summary unreadCount for the parent doc
    const safePhone = myPhone.replace(/\+/g, '');
    const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
    batch.set(chatRef, {
      [`unreadCount_${safePhone}`]: 0
    }, { merge: true });

    await batch.commit();
  } catch (error) {
    console.error('[ChatService] Mark as Read Failed:', error);
  }
};

/**
 * Marks all incoming 'sent' messages as 'delivered' in a specific chat.
 */
export const markMessagesAsDelivered = async (chatId: string, myPhone: string) => {
  if (!chatId || !myPhone) return;
  try {
    const sentSnapshot = await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .where('status', '==', 'sent')
      .get();

    if (sentSnapshot.empty) return;

    const batch = firestore().batch();
    let hasUpdates = false;

    sentSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Only delivered if someone ELSE sent it
      if (data.senderPhone !== myPhone) {
        batch.update(doc.ref, { status: 'delivered' });
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      await batch.commit();
    }
  } catch (error) {
    console.error('[ChatService] Mark as Delivered Failed:', error);
  }
};

/**
 * Subscribes to all chats where the current user is a participant.
 */
export const subscribeUserChats = (userPhone: string, onUpdate: (chats: any[]) => void) => {
  return firestore()
    .collection(Collections.CHATS)
    .where('participants', 'array-contains', userPhone)
    .orderBy('lastTime', 'desc')
    .onSnapshot(snapshot => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(chats);
    }, error => {
      console.error('[ChatService] User Chats Sync Failed:', error);
    });
};

/**
 * Fetches a user's basic profile by their phone number.
 */
export const fetchUserByPhone = async (phone: string) => {
  try {
    const snapshot = await firestore()
      .collection(Collections.USERS)
      .where('phoneNumber', '==', phone)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error('[ChatService] Fetch User Failed:', error);
    return null;
  }
};

/**
 * Updates the typing status of a user in a specific chat.
 */
export const updateTypingStatus = async (chatId: string, userPhone: string, isTyping: boolean) => {
  if (!chatId || !userPhone) return;
  try {
    await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection('typing')
      .doc('status')
      .set({
        [userPhone.replace(/\+/g, '')]: isTyping,
        lastUpdate: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
  } catch (error) {
    console.error('[ChatService] Typing status update failed:', error);
  }
};

/**
 * Subscribes to the typing status of a specific chat.
 */
export const subscribeTypingStatus = (chatId: string, onUpdate: (typingMap: Record<string, boolean>) => void) => {
  return firestore()
    .collection(Collections.CHATS)
    .doc(chatId)
    .collection('typing')
    .doc('status')
    .onSnapshot(doc => {
      if (doc.exists) {
        onUpdate(doc.data() as Record<string, boolean>);
      } else {
        onUpdate({});
      }
    }, error => {
      console.error('[ChatService] Typing status sync failed:', error);
    });
};
