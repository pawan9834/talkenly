import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  useColorScheme,
  StatusBar,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
  Linking,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, firestore } from "../lib/firebase";
import {
  sendMessage,
  subscribeMessages,
  runFirestoreDiagnostics,
  subscribeTypingStatus,
  markMessagesAsRead,
  markMessagesAsDelivered,
  deleteMessagesForEveryone,
  deleteMessagesForMe,
  toggleStarMessages,
} from "../lib/chatService";
import { startMediaUploadTask } from "../lib/mediaService";
import { getCachedImage } from "../lib/imageHandler";
import { RootStackParamList } from "../types";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChatHeader,
  ChatInput,
  MessageItem,
  ChatMessageUI,
} from "../components/chat";
import MessageActionBar from "../components/chat/MessageActionBar";
type NavProp = NativeStackNavigationProp<RootStackParamList, "Chat">;
type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;
export default function ChatScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ChatRouteProp>();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const {
    chatId,
    recipientName,
    recipientPhoto,
    recipientPhone,
    recipientUid,
  } = route.params;
  const myPhone = auth().currentUser?.phoneNumber;
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<ChatMessageUI[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessageUI | null>(
    null,
  );
  const [cachedRecipientPhoto, setCachedRecipientPhoto] = useState<
    string | null
  >(recipientPhoto || null);
  const [recipientStatus, setRecipientStatus] = useState<{
    isOnline: boolean;
    isTyping: boolean;
  }>({
    isOnline: false,
    isTyping: false,
  });
  const [resolvedRecipientUid, setResolvedRecipientUid] = useState<
    string | null
  >(recipientUid || null);
  const [activeUploads, setActiveUploads] = useState<
    Record<
      string,
      {
        progress: number;
        task: any;
        localUri: string;
      }
    >
  >({});
  const flatListRef = useRef<FlatList>(null);
  useEffect(() => {
    let unsubscribe: () => void;
    const setupStatusListener = async () => {
      let targetUid = recipientUid;
      if (!targetUid && recipientPhone) {
        try {
          const snapshot = await firestore()
            .collection("users")
            .where("phoneNumber", "==", recipientPhone)
            .limit(1)
            .get();
          if (!snapshot.empty) {
            targetUid = snapshot.docs[0].id;
            setResolvedRecipientUid(targetUid);
            try {
              const { getDb } = require("../lib/database");
              const db = getDb();
              await db.runAsync(
                "UPDATE contacts SET uid = ? WHERE normalizedPhone = ?",
                [targetUid, recipientPhone],
              );
            } catch (cacheErr) {}
          }
        } catch (e) {
          console.error(`[Status] Lookup failed:`, e);
        }
      }
      if (targetUid) {
        unsubscribe = firestore()
          .collection("users")
          .doc(targetUid)
          .onSnapshot(
            (doc) => {
              if (doc.exists()) {
                const data = doc.data();
                setRecipientStatus((prev) => ({
                  ...prev,
                  isOnline: !!data?.isOnline,
                }));
              }
            },
            (err) => {
              console.error(`[Status] Snapshot error:`, err);
            },
          );
      }
    };
    setupStatusListener();
    const unsubTyping = subscribeTypingStatus(chatId, (statusMap) => {
      if (!recipientPhone) return;
      const recipientKey = recipientPhone.replace(/\+/g, "");
      const isTyping = !!statusMap?.[recipientKey];
      setRecipientStatus((prev) => ({ ...prev, isTyping }));
    });
    return () => {
      unsubscribe && unsubscribe();
      unsubTyping && unsubTyping();
    };
  }, [recipientUid, recipientPhone, chatId]);
  useEffect(() => {
    if (recipientPhoto) {
      getCachedImage(recipientPhoto).then(setCachedRecipientPhoto);
    }
  }, [recipientPhoto]);
  const colors = useMemo(
    () => ({
      background: isDark ? "#0B141A" : "#E5DDD5",
      headerBg: isDark ? "#202C33" : "#008080",
      cardBg: isDark ? "#1F2C34" : "#FFFFFF",
      textPrimary: isDark ? "#E9EDEF" : "#111111",
      textSecondary: isDark ? "#8696A0" : "#667781",
      bubbleSelf: isDark ? "#005C4B" : "#DCF8C6",
      bubbleOther: isDark ? "#202C33" : "#FFFFFF",
      inputBg: isDark ? "#2A3942" : "#FFFFFF",
      inputAreaBg: isDark ? "#111B21" : "#F0F0F0",
      icon: "#8696A0",
      accent: "#00A884",
      statusBar: isDark ? "#202C33" : "#008080",
      divider: isDark ? "#222D34" : "#E9EDEF",
      modalBg: isDark ? "#202C33" : "#FFFFFF",
    }),
    [isDark],
  );
  useEffect(() => {
    if (!chatId || !myPhone) return;
    const unsubscribe = subscribeMessages(
      chatId,
      myPhone,
      (firebaseMessages) => {
        const mappedMessages: ChatMessageUI[] = firebaseMessages.map((msg) => ({
          id: msg.id,
          text: msg.text,
          isMe: msg.senderPhone === myPhone,
          time: msg.timestamp?.toDate
            ? msg.timestamp
                .toDate()
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Sending...",
          status: msg.status as any,
          type: (msg.type ?? "text") as ChatMessageUI["type"],
          contactData: msg.contactData,
          locationData: msg.locationData,
          liveLocationData: msg.liveLocationData,
          replyTo: msg.replyTo,
          isStarred: msg.starredBy?.includes(myPhone || "") || false,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          fileSize: msg.fileSize,
          fileName: msg.fileName,
          duration: msg.duration,
        }));
        setMessages(mappedMessages);
      },
    );
    return unsubscribe;
  }, [chatId, myPhone]);
  useEffect(() => {
    if (!chatId || !myPhone || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (
      !lastMsg.isMe &&
      (lastMsg.status === "sent" || lastMsg.status === "delivered")
    ) {
      markMessagesAsDelivered(chatId, myPhone);
      markMessagesAsRead(chatId, myPhone);
    }
  }, [
    messages.length > 0 ? messages[messages.length - 1].id : null,
    chatId,
    myPhone,
  ]);
  const handleSend = async (text: string, replyTo?: any, uploadAsset?: any) => {
    if (!myPhone || !chatId) return;
    if (uploadAsset) {
      const tempId = `temp-${Date.now()}`;
      const { task, reference, fullFilename } = startMediaUploadTask(
        chatId,
        uploadAsset,
      );
      const optimisticMsg: ChatMessageUI = {
        id: tempId,
        text: text || (uploadAsset.type === "video" ? "📽️ Video" : "📷 Photo"),
        isMe: true,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "pending",
        type: uploadAsset.type === "video" ? "video" : "image",
        mediaUrl: uploadAsset.uri,
        mediaType: uploadAsset.type === "video" ? "video" : "image",
        fileSize: uploadAsset.fileSize || 0,
        fileName:
          uploadAsset.fileName ||
          `${Date.now()}.${uploadAsset.type === "video" ? "mp4" : "jpg"}`,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setActiveUploads((prev) => ({
        ...prev,
        [tempId]: { progress: 0, task, localUri: uploadAsset.uri },
      }));
      task.on(
        "state_changed",
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          setActiveUploads((prev) => ({
            ...prev,
            [tempId]: { ...prev[tempId], progress },
          }));
        },
        (error) => {
          console.error("[Upload] Failed:", error);
          setActiveUploads((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, status: "sent", text: "⚠️ Upload failed" }
                : m,
            ),
          );
        },
        async () => {
          const downloadUrl = await reference.getDownloadURL();
          const mediaPayload = JSON.stringify({
            __type: "media",
            mediaUrl: downloadUrl,
            mediaType: uploadAsset.type === "video" ? "video" : "image",
            text: text || undefined,
            duration: uploadAsset.duration,
            fileSize: uploadAsset.fileSize || 0,
            fileName: fullFilename,
          });
          const replyData = replyTo
            ? {
                id: replyTo.id,
                text: replyTo.text,
                senderPhone: replyTo.isMe
                  ? "You"
                  : recipientName || replyTo.senderPhone,
                type: replyTo.type,
              }
            : undefined;
          await sendMessage(
            chatId,
            myPhone,
            mediaPayload,
            [myPhone, recipientPhone],
            replyData,
          );
          setActiveUploads((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        },
      );
      return;
    }
    const replyData = replyTo
      ? {
          id: replyTo.id,
          text: replyTo.text,
          senderPhone: replyTo.isMe
            ? "You"
            : recipientName || replyTo.senderPhone,
          type: replyTo.type,
        }
      : undefined;
    const success = await sendMessage(
      chatId,
      myPhone,
      text,
      [myPhone, recipientPhone],
      replyData,
    );
    if (!success) {
      Alert.alert("Error", "Failed to send message.");
    } else {
      setReplyToMessage(null);
    }
  };
  const handleLongPress = (msg: ChatMessageUI) => {
    toggleSelection(msg);
  };
  const handlePress = (msg: ChatMessageUI) => {
    if (selectedMessages.length > 0) {
      toggleSelection(msg);
    } else if (msg.mediaUrl) {
      const mediaMsgs = messages.filter(
        (m) => m.type === "image" || m.type === "video",
      );
      const idx = mediaMsgs.findIndex((m) => m.id === msg.id);
      if (idx !== -1) {
        navigation.navigate("ImageViewer", {
          mediaMessages: mediaMsgs,
          initialIndex: idx,
          recipientName: recipientName || "Media",
        });
      }
    }
  };
  const toggleSelection = (msg: ChatMessageUI) => {
    setSelectedMessages((prev) => {
      const exists = prev.find((m) => m.id === msg.id);
      if (exists) {
        return prev.filter((m) => m.id !== msg.id);
      } else {
        return [...prev, msg];
      }
    });
  };
  const handleDeselect = () => setSelectedMessages([]);
  const handleReply = (msgs: ChatMessageUI[]) => {
    if (msgs.length === 1) {
      setReplyToMessage(msgs[0]);
    }
    setSelectedMessages([]);
  };
  const handleDelete = (msgs: ChatMessageUI[] | ChatMessageUI) => {
    const msgsArray = Array.isArray(msgs) ? msgs : [msgs];
    if (msgsArray.length === 0) return;
    setDeleteModalVisible(true);
  };
  const handleDeleteForMe = async () => {
    if (!chatId || !myPhone || selectedMessages.length === 0) return;
    const msgIds = selectedMessages.map((m) => m.id);
    setDeleteModalVisible(false);
    setSelectedMessages([]);
    await deleteMessagesForMe(chatId, msgIds, myPhone);
  };
  const handleDeleteForEveryone = async () => {
    if (!chatId || selectedMessages.length === 0) return;
    const myMsgIds = selectedMessages.filter((m) => m.isMe).map((m) => m.id);
    if (myMsgIds.length === 0) {
      Alert.alert(
        "Selection restricted",
        "You can only delete your own messages for everyone.",
      );
      setDeleteModalVisible(false);
      return;
    }
    setDeleteModalVisible(false);
    setSelectedMessages([]);
    await deleteMessagesForEveryone(chatId, myMsgIds);
  };
  const handleForward = (msgs: ChatMessageUI[]) => {
    setSelectedMessages([]);
    Alert.alert("Forward", `Forwarding ${msgs.length} messages...`);
  };
  const handleStar = async (msgs: ChatMessageUI[]) => {
    if (!chatId || !myPhone || msgs.length === 0) return;
    const anyUnstarred = msgs.some((m) => !m.isStarred);
    const shouldStar = anyUnstarred;
    const msgIds = msgs.map((m) => m.id);
    setSelectedMessages([]);
    await toggleStarMessages(chatId, msgIds, myPhone, shouldStar);
  };
  const handleInfo = (msgs: ChatMessageUI[]) => {
    setSelectedMessages([]);
    if (msgs.length === 1) {
      Alert.alert(
        "Message Info",
        `Sent at: ${msgs[0].time}\nStatus: ${msgs[0].status}`,
      );
    }
  };
  const handleDiagnostics = async () => {
    const result = await runFirestoreDiagnostics(chatId);
    Alert.alert("Diagnostic Result", result);
  };
  const cancelUpload = (msgId: string) => {
    const upload = activeUploads[msgId];
    if (upload) {
      upload.task.cancel();
      setActiveUploads((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };
  const scrollToMessage = (msgId: string) => {
    const index = messages.findIndex((m) => m.id === msgId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.statusBar} />
      {selectedMessages.length > 0 ? (
        <MessageActionBar
          selectedCount={selectedMessages.length}
          selectedMessages={selectedMessages}
          headerBg={colors.headerBg}
          onDeselect={handleDeselect}
          onReply={handleReply}
          onDelete={handleDelete}
          onForward={handleForward}
          onStar={handleStar}
          onInfo={handleInfo}
        />
      ) : (
        <ChatHeader
          navigation={navigation}
          chatId={chatId}
          recipientName={recipientName}
          recipientPhoto={cachedRecipientPhoto}
          recipientUid={resolvedRecipientUid || recipientUid}
          recipientPhone={recipientPhone}
          isOnline={recipientStatus.isTyping ? false : recipientStatus.isOnline}
          isTyping={recipientStatus.isTyping}
          colors={colors}
          onClearChat={() => navigation.goBack()}
          onBlock={() => navigation.navigate("Home")}
          onMediaLinksDocs={() =>
            navigation.navigate("MediaLinksDocs", { chatId, recipientName })
          }
        />
      )}
      {}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <View
            style={[
              styles.modernModal,
              { backgroundColor: colors.modalBg || colors.cardBg },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Delete message?
            </Text>
            <View style={styles.modalOptionsList}>
              {selectedMessages.length > 0 &&
                selectedMessages.every((m) => m.isMe) && (
                  <TouchableOpacity
                    style={styles.modalOptionItem}
                    onPress={handleDeleteForEveryone}
                  >
                    <Text
                      style={[styles.modalOptionText, { color: colors.accent }]}
                    >
                      Delete for everyone
                    </Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={styles.modalOptionItem}
                onPress={handleDeleteForMe}
              >
                <Text
                  style={[styles.modalOptionText, { color: colors.accent }]}
                >
                  Delete for me
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOptionItem}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text
                  style={[styles.modalOptionText, { color: colors.accent }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <View style={[styles.chatBody, { backgroundColor: colors.background }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageItem
              item={item}
              colors={{ ...colors, accent: colors.accent }}
              onLongPress={handleLongPress}
              onPress={handlePress}
              onReplyPress={scrollToMessage}
              isSelected={selectedMessages.some((m) => m.id === item.id)}
              isSelectionMode={selectedMessages.length > 0}
              uploadProgress={activeUploads[item.id]?.progress}
              onCancelUpload={() => cancelUpload(item.id)}
            />
          )}
          initialNumToRender={15}
          windowSize={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={Platform.OS === "android"}
          ListFooterComponent={
            recipientStatus.isTyping ? (
              <MessageItem
                item={{
                  id: "typing-indicator",
                  text: "Typing...",
                  isMe: false,
                  time: "",
                  status: "pending",
                }}
                colors={colors}
              />
            ) : null
          }
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }}
        />
        <ChatInput
          onSend={handleSend}
          chatId={chatId}
          userPhone={myPhone || ""}
          replyTo={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          colors={colors}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatBody: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modernModal: {
    width: "80%",
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  modalOptionsList: {
    width: "100%",
  },
  modalOptionItem: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
