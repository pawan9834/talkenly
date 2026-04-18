import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth, firestore } from "../lib/firebase";
import { getCachedImage } from "../lib/imageHandler";
import { MessageItem, ChatMessageUI } from "../components/chat";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";
export default function StarredMessagesScreen() {
  const navigation = useNavigation<any>();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [starredMessages, setStarredMessages] = useState<any[]>([]);
  const myPhone = auth().currentUser?.phoneNumber;
  const colors = {
    background: "#0F172A",
    headerBg: "#0F172A",
    cardBg: "#1E293B",
    textPrimary: "#FFFFFF",
    textSecondary: "#94A3B8",
    accent: "#FF6B00",
  };
  useEffect(() => {
    if (!myPhone) return;
    const unsubscribe = firestore()
      .collectionGroup("messages")
      .where("starredBy", "array-contains", myPhone)
      .orderBy("timestamp", "desc")
      .onSnapshot(
        async (snapshot) => {
          const messages = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              const chatId = doc.ref.parent.parent?.id;
              let chatName = "Private Chat";
              if (chatId) {
                const chatDoc = await firestore()
                  .collection("chats")
                  .doc(chatId)
                  .get();
                if (chatDoc.exists()) {
                  const chatData = chatDoc.data();
                  const otherParticipants = chatData?.participants?.filter(
                    (p: string) => p !== myPhone,
                  );
                  chatName = otherParticipants?.[0] || "Unknown";
                }
              }
              return {
                id: doc.id,
                chatId,
                chatName,
                ...data,
                time: data.timestamp?.toDate
                  ? data.timestamp.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "",
                isMe: data.senderPhone === myPhone,
                isStarred: true,
              };
            }),
          );
          setStarredMessages(messages);
          setLoading(false);
        },
        (err: any) => {
          console.error("[Starred] Collection Group Query Failed:", err);
          setLoading(false);
        },
      );
    return unsubscribe;
  }, [myPhone]);
  const renderStarredItem = ({ item }: { item: any }) => (
    <View style={[styles.messageContainer, { backgroundColor: colors.cardBg }]}>
      {}
      <View style={styles.chatHeader}>
        <Ionicons name="person-circle" size={24} color={colors.accent} />
        <Text style={[styles.chatName, { color: colors.textPrimary }]}>
          {item.chatName}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textSecondary}
        />
      </View>
      {}
      <View style={styles.bubbleWrapper}>
        <MessageItem
          item={item as ChatMessageUI}
          colors={{
            bubbleSelf: isDark ? "#005C4B" : "#DCF8C6",
            bubbleOther: isDark ? "#202C33" : "#FFFFFF",
            textPrimary: colors.textPrimary,
            textSecondary: colors.textSecondary,
            accent: colors.accent,
          }}
          isSelectionMode={false}
        />
      </View>
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
        {item.timestamp?.toDate
          ? item.timestamp.toDate().toLocaleDateString()
          : ""}
      </Text>
    </View>
  );
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.headerContainer}>
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFill} />
        <AnimatedBubbles />
        <SafeAreaView edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Starred messages</Text>
            <TouchableOpacity style={styles.searchBtn}>
              <Ionicons name="search" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={{ marginTop: 50 }}
          />
        ) : starredMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.starCircle}>
              <Ionicons name="star" size={80} color="#FFFFFF" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No starred messages
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tap and hold any message in any chat to star it, so you can easily
              find it later.
            </Text>
          </View>
        ) : (
          <FlatList
            data={starredMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderStarredItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    paddingBottom: 10,
    marginBottom: 10,
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  backBtn: { padding: 8 },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  searchBtn: { padding: 12 },
  body: { flex: 1 },
  list: { paddingVertical: 12 },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    paddingBottom: 8,
  },
  chatName: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  bubbleWrapper: {
    marginLeft: -8,
  },
  dateText: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "right",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  starCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptySub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
