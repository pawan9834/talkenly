import firestore from "@react-native-firebase/firestore";
import { Collections, auth } from "./firebase";
export interface ChatMessage {
  id: string;
  text: string;
  senderPhone: string;
  timestamp: any;
  status: "sent" | "delivered" | "read";
  type: string;
  replyTo?: {
    id: string;
    text: string;
    senderPhone: string;
    type?: string;
  };
  starredBy?: string[];
  mediaUrl?: string;
  mediaType?: "image" | "video";
  fileSize?: number;
  fileName?: string;
  duration?: number | null;
  contactData?: { name: string; phones: string[] };
  locationData?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  liveLocationData?: {
    liveId: string;
    duration: string;
    latitude: number;
    longitude: number;
    address: string;
  };
}
export const generateChatId = (phone1: string, phone2: string) => {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};
export const sendMessage = async (
  chatId: string,
  senderPhone: string,
  text: string,
  participants: string[],
  replyTo?: ChatMessage["replyTo"],
) => {
  try {
    const timestamp = firestore.FieldValue.serverTimestamp();
    let messageType = "text";
    let contactData: { name: string; phones: string[] } | undefined;
    let locationData:
      | { latitude: number; longitude: number; address: string }
      | undefined;
    let liveLocationData:
      | {
          liveId: string;
          duration: string;
          latitude: number;
          longitude: number;
          address: string;
        }
      | undefined;
    let mediaUrl: string | undefined;
    let mediaTypeStr: "image" | "video" | undefined;
    let duration: number | null = null;
    let displayText = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.__type === "contact") {
        messageType = "contact";
        contactData = { name: parsed.name, phones: parsed.phones };
        displayText = `👤 ${parsed.name}`;
      } else if (parsed.__type === "location") {
        messageType = "location";
        locationData = {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          address: parsed.address,
        };
        displayText = `📍 ${parsed.address || `${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)}`}`;
      } else if (parsed.__type === "liveLocation") {
        messageType = "liveLocation";
        liveLocationData = {
          liveId: parsed.liveId,
          duration: parsed.duration,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          address: parsed.address,
        };
        displayText = `📍 Live location · ${parsed.duration}`;
      } else if (parsed.__type === "media") {
        messageType = parsed.mediaType;
        mediaUrl = parsed.mediaUrl;
        mediaTypeStr = parsed.mediaType;
        duration = parsed.duration;
        displayText = parsed.mediaType === "video" ? "📽️ Video" : "📷 Photo";
      }
    } catch (_) {}
    const msgRef = firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .doc();
    const messageDoc: any = {
      text: displayText,
      senderPhone,
      timestamp,
      status: "sent",
      type: messageType,
    };
    if (contactData) messageDoc.contactData = contactData;
    if (locationData) messageDoc.locationData = locationData;
    if (liveLocationData) messageDoc.liveLocationData = liveLocationData;
    if (mediaUrl) {
      messageDoc.mediaUrl = mediaUrl;
      messageDoc.mediaType = mediaTypeStr;
      messageDoc.duration = duration;
    }
    if (replyTo) {
      messageDoc.replyTo = replyTo;
    }
    await msgRef.set(messageDoc);
    const recipientPhone = participants.find((p) => p !== senderPhone);
    const updateData: any = {
      lastMessage: displayText,
      lastTime: timestamp,
      lastSender: senderPhone,
      participants: participants,
    };
    if (recipientPhone) {
      const safePhone = recipientPhone.replace(/\+/g, "");
      updateData[`unreadCount_${safePhone}`] =
        firestore.FieldValue.increment(1);
    }
    await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .set(updateData, { merge: true });
    return true;
  } catch (error) {
    console.error("[ChatService] Send Failed:", error);
    return false;
  }
};
export const subscribeMessages = (
  chatId: string,
  myPhone: string,
  onUpdate: (messages: ChatMessage[]) => void,
) => {
  return firestore()
    .collection(Collections.CHATS)
    .doc(chatId)
    .collection(Collections.MESSAGES)
    .orderBy("timestamp", "asc")
    .onSnapshot(
      (snapshot) => {
        const messages = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(
            (msg: any) => !msg.deletedBy?.includes(myPhone),
          ) as ChatMessage[];
        onUpdate(messages);
      },
      (error) => {
        console.error("[ChatService] Subscription Error:", error);
      },
    );
};
export const runFirestoreDiagnostics = async (chatId: string) => {
  const user = auth().currentUser;
  let log = "─── FIRESTORE DIAGNOSTICS ───\n";
  log += `1. Auth State: ${user ? `UID: ${user.uid}, Phone: ${user.phoneNumber}` : "NOT LOGGED IN"}\n`;
  try {
    log += "2. Testing Write to /diagnostics/test...\n";
    await firestore().collection("diagnostics").doc("test").set({
      timestamp: firestore.FieldValue.serverTimestamp(),
      userId: user?.uid,
    });
    log += "   ✅ Write Success\n";
  } catch (e: any) {
    log += `   ❌ Write Failed: ${e.message}\n`;
  }
  try {
    log += `3. Testing Read from /chats/${chatId}...\n`;
    const chatDoc = await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .get();
    log += `   ✅ Read Success. Exists: ${chatDoc.exists}\n`;
  } catch (e: any) {
    log += `   ❌ Read Failed: ${e.message}\n`;
  }
  try {
    log += `4. Testing Sub-collection Read...\n`;
    const msgs = await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .limit(1)
      .get();
    log += `   ✅ Sub-collection Read Success. Docs: ${msgs.size}\n`;
  } catch (e: any) {
    log += `   ❌ Sub-collection Read Failed: ${e.message}\n`;
  }
  log += "─── END DIAGNOSTICS ───";
  return log;
};
export const markMessagesAsRead = async (chatId: string, myPhone: string) => {
  if (!chatId || !myPhone) return;
  try {
    const unreadSnapshot = await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .where("senderPhone", "!=", myPhone)
      .get();
    if (unreadSnapshot.empty) return;
    const batch = firestore().batch();
    unreadSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "read") {
        batch.update(doc.ref, { status: "read" });
      }
    });
    const safePhone = myPhone.replace(/\+/g, "");
    const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
    batch.set(
      chatRef,
      {
        [`unreadCount_${safePhone}`]: 0,
      },
      { merge: true },
    );
    await batch.commit();
  } catch (error) {
    console.error("[ChatService] Mark as Read Failed:", error);
  }
};
export const markMessagesAsDelivered = async (
  chatId: string,
  myPhone: string,
) => {
  if (!chatId || !myPhone) return;
  try {
    const sentSnapshot = await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection(Collections.MESSAGES)
      .where("status", "==", "sent")
      .get();
    if (sentSnapshot.empty) return;
    const batch = firestore().batch();
    let hasUpdates = false;
    sentSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.senderPhone !== myPhone) {
        batch.update(doc.ref, { status: "delivered" });
        hasUpdates = true;
      }
    });
    if (hasUpdates) {
      await batch.commit();
    }
  } catch (error) {
    console.error("[ChatService] Mark as Delivered Failed:", error);
  }
};
export const subscribeUserChats = (
  userPhone: string,
  onUpdate: (chats: any[]) => void,
) => {
  return firestore()
    .collection(Collections.CHATS)
    .where("participants", "array-contains", userPhone)
    .orderBy("lastTime", "desc")
    .onSnapshot(
      (snapshot) => {
        const chats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        onUpdate(chats);
      },
      (error) => {
        console.error("[ChatService] User Chats Sync Failed:", error);
      },
    );
};
export const fetchUserByPhone = async (phone: string) => {
  try {
    const snapshot = await firestore()
      .collection(Collections.USERS)
      .where("phoneNumber", "==", phone)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error("[ChatService] Fetch User Failed:", error);
    return null;
  }
};
export const updateTypingStatus = async (
  chatId: string,
  userPhone: string,
  isTyping: boolean,
) => {
  if (!chatId || !userPhone) return;
  try {
    await firestore()
      .collection(Collections.CHATS)
      .doc(chatId)
      .collection("typing")
      .doc("status")
      .set(
        {
          [userPhone.replace(/\+/g, "")]: isTyping,
          lastUpdate: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    console.error("[ChatService] Typing status update failed:", error);
  }
};
export const subscribeTypingStatus = (
  chatId: string,
  onUpdate: (typingMap: Record<string, boolean>) => void,
) => {
  return firestore()
    .collection(Collections.CHATS)
    .doc(chatId)
    .collection("typing")
    .doc("status")
    .onSnapshot(
      (doc) => {
        if (doc.exists()) {
          onUpdate(doc.data() as Record<string, boolean>);
        } else {
          onUpdate({});
        }
      },
      (error) => {
        console.error("[ChatService] Typing status sync failed:", error);
      },
    );
};
export const deleteChat = async (chatId: string) => {
  if (!chatId) return false;
  try {
    const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
    const messagesSnapshot = await chatRef
      .collection(Collections.MESSAGES)
      .get();
    const batch = firestore().batch();
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    const typingRef = chatRef.collection("typing").doc("status");
    batch.delete(typingRef);
    batch.delete(chatRef);
    await batch.commit();
    return true;
  } catch (error) {
    console.error("[ChatService] Deletion Failed:", error);
    return false;
  }
};
export const blockUser = async (blockedPhone: string): Promise<boolean> => {
  if (!blockedPhone) return false;
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;
    await firestore()
      .collection(Collections.USERS)
      .doc(currentUser.uid)
      .update({
        blockedUsers: firestore.FieldValue.arrayUnion(blockedPhone),
      });
    return true;
  } catch (error) {
    console.error("[ChatService] Block User Failed:", error);
    return false;
  }
};
export const unblockUser = async (blockedPhone: string): Promise<boolean> => {
  if (!blockedPhone) return false;
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;
    await firestore()
      .collection(Collections.USERS)
      .doc(currentUser.uid)
      .update({
        blockedUsers: firestore.FieldValue.arrayRemove(blockedPhone),
      });
    return true;
  } catch (error) {
    console.error("[ChatService] Unblock User Failed:", error);
    return false;
  }
};
export const deleteMessagesForEveryone = async (
  chatId: string,
  messageIds: string[],
) => {
  if (!chatId || messageIds.length === 0) return false;
  try {
    const batch = firestore().batch();
    const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
    messageIds.forEach((id) => {
      const msgRef = chatRef.collection(Collections.MESSAGES).doc(id);
      batch.update(msgRef, {
        text: "🚫 This message was deleted",
        type: "deleted",
        contactData: firestore.FieldValue.delete(),
        locationData: firestore.FieldValue.delete(),
        liveLocationData: firestore.FieldValue.delete(),
      });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("[ChatService] Delete for Everyone Failed:", error);
    return false;
  }
};
export const deleteMessagesForMe = async (
  chatId: string,
  messageIds: string[],
  myPhone: string,
) => {
  if (!chatId || messageIds.length === 0 || !myPhone) return false;
  try {
    const batch = firestore().batch();
    const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
    messageIds.forEach((id) => {
      const msgRef = chatRef.collection(Collections.MESSAGES).doc(id);
      batch.update(msgRef, {
        deletedBy: firestore.FieldValue.arrayUnion(myPhone),
      });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("[ChatService] Delete for Me Failed:", error);
    return false;
  }
};
export const toggleStarMessages = async (
  chatId: string,
  messageIds: string[],
  myPhone: string,
  shouldStar: boolean,
) => {
  if (!chatId || messageIds.length === 0 || !myPhone) return false;
  try {
    const batch = firestore().batch();
    const chatRef = firestore().collection(Collections.CHATS).doc(chatId);
    messageIds.forEach((id) => {
      const msgRef = chatRef.collection(Collections.MESSAGES).doc(id);
      batch.update(msgRef, {
        starredBy: shouldStar
          ? firestore.FieldValue.arrayUnion(myPhone)
          : firestore.FieldValue.arrayRemove(myPhone),
      });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("[ChatService] Star Messages Failed:", error);
    return false;
  }
};
