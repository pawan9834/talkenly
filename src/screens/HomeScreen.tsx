import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { auth, firestore } from "../lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initDB } from "../lib/database";
import { syncContacts } from "../lib/contactSync";
import { normalizeIndianPhoneNumber } from "../lib/phoneUtils";
import {
  subscribeUserChats,
  fetchUserByPhone,
  markMessagesAsDelivered,
} from "../lib/chatService";
import { formatStatusTime } from "../lib/timeUtils";
import { getCachedImage } from "../lib/imageHandler";
import { deleteAccountAndAllData } from "../lib/deleteAccountService";
import StatusRing from "../components/chat/StatusRing";
import StatusScreen from "./StatusScreen";
import CallsTab from "../components/home/CallsTab";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;
const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#1E293B",     // Vibrant Orange
  onyx: "#0F172A",        // Deep Navy
  slate: "#1E293B",
  background: "#0F172A",  // Deep Navy background
  white: "#FFFFFF",
  textPrimary: "#FFFFFF", // White text
  textSecondary: "#94A3B8", // Slate secondary text
  border: "rgba(255,255,255,0.05)", // Glassmorphism border
  unreadBadge: "#FF6B00",
  indicator: "#FF6B00",
  accent: "#FF6B00",
};

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"Chats" | "Updates" | "Calls">("Chats");
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [recipientCache, setRecipientCache] = useState<Record<string, any>>({});
  const [userStatuses, setUserStatuses] = useState<Record<string, any>>({});
  const [viewedStatusIds, setViewedStatusIds] = useState<Set<string>>(new Set());

  const TABS = ["Chats", "Updates", "Calls"] as const;
  const scrollViewRef = React.useRef<ScrollView>(null);
  const scrollX = React.useRef(new Animated.Value(0)).current;

  const handleTabPress = (tab: (typeof TABS)[number], index: number) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  };

  useEffect(() => {
    initDB();
    syncContacts();
    const preloadProfile = async () => {
      const user = auth().currentUser;
      if (user) {
        try {
          const doc = await firestore().collection("users").doc(user.uid).get();
          if (doc.exists()) {
            const data = doc.data();
            const currentPhone = data?.phoneNumber;
            if (currentPhone && (currentPhone.includes(" ") || !currentPhone.startsWith("+"))) {
              const cleanedPhone = normalizeIndianPhoneNumber(currentPhone);
              if (cleanedPhone && cleanedPhone !== currentPhone) {
                await firestore().collection("users").doc(user.uid).update({ phoneNumber: cleanedPhone });
              }
            }
            const cacheKey = `profile_cache_${user.uid}`;
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              displayName: data?.displayName,
              photoURL: data?.photoURL,
              about: data?.about,
            }));
          }
        } catch (e) { }
      }
    };
    preloadProfile();
  }, []);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user?.phoneNumber) return;
    const unsubscribe = subscribeUserChats(user.phoneNumber, async (rawChats) => {
      const resolvedChats = await Promise.all(rawChats.map(async (chat) => {
        const otherPhone = chat.participants.find((p: string) => p !== user.phoneNumber);
        if (!otherPhone) return null;
        let recipient = recipientCache[otherPhone];
        if (!recipient) {
          recipient = await fetchUserByPhone(otherPhone);
          if (recipient) {
            setRecipientCache((prev) => ({ ...prev, [otherPhone]: recipient }));
          }
        }
        const avatarUrl = recipient?.photoURL || `https://i.pravatar.cc/150?u=${otherPhone}`;
        const cachedAvatar = await getCachedImage(avatarUrl);
        const mySafePhone = user.phoneNumber?.replace(/\+/g, "") || "";
        const unreadCount = chat[`unreadCount_${mySafePhone}`] || 0;
        return {
          id: chat.id,
          name: recipient?.displayName || otherPhone,
          message: chat.lastMessage || "No messages yet",
          time: formatStatusTime(chat.lastTime),
          unread: unreadCount,
          avatar: cachedAvatar,
          phone: otherPhone,
          uid: recipient?.id || recipient?.uid,
        };
      }));
      const filteredChats = resolvedChats.filter((c) => c !== null);
      setChats(filteredChats);
      rawChats.forEach((chat) => {
        const lastMsgSender = chat.lastSender;
        const myPhone = user.phoneNumber || "";
        if (lastMsgSender && lastMsgSender !== myPhone) {
          markMessagesAsDelivered(chat.id, myPhone);
        }
      });
    });
    return unsubscribe;
  }, [recipientCache]);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user || chats.length === 0) return;
    const unsubViewed = firestore().collection("status_views").where("viewerUid", "==", user.uid).onSnapshot((snap) => {
      if (!snap) return;
      const ids = new Set(snap.docs.map((doc) => (doc.data() as any).statusId));
      setViewedStatusIds(ids);
    });
    const phones = chats.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) return unsubViewed;
    const unsubscribes: (() => void)[] = [unsubViewed];
    const chunks = [];
    for (let i = 0; i < phones.length; i += 30) { chunks.push(phones.slice(i, i + 30)); }
    const oneDayMillis = 24 * 60 * 60 * 1000;
    const chunkResults: Record<number, any> = {};
    chunks.forEach((chunk, index) => {
      const unsub = firestore().collection("statuses").where("phoneNumber", "in", chunk).onSnapshot((snapshot) => {
        if (!snapshot) return;
        const now = Date.now();
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
          .filter((doc) => !doc.createdAt || now - doc.createdAt.toMillis() < oneDayMillis);
        const groupedByPhone = docs.reduce((acc: any, status: any) => {
          const phone = status.phoneNumber;
          if (!acc[phone]) acc[phone] = [];
          acc[phone].push(status);
          return acc;
        }, {});
        chunkResults[index] = groupedByPhone;
        const merged: Record<string, any[]> = {};
        Object.values(chunkResults).forEach((res: any) => {
          Object.keys(res).forEach((phone) => {
            if (!merged[phone]) merged[phone] = [];
            merged[phone] = [...merged[phone], ...res[phone]];
          });
        });
        setUserStatuses(merged);
      });
      unsubscribes.push(unsub);
    });
    return () => unsubscribes.forEach((un) => un());
  }, [chats.map((c) => c.id).join(","), chats.length]);

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (e) { }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccountAndAllData();
    } catch (error: any) {
      Alert.alert("Delete Failed", error.message || "Could not delete account.");
    } finally {
      setDeleteModalVisible(false);
      setDeleteLoading(false);
    }
  };

  const renderChatItem = React.useCallback(({ item }: { item: any }) => {
    const stories = userStatuses[item.phone] || [];
    const hasStatus = stories.length > 0;
    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("Chat", {
          chatId: item.id,
          recipientName: item.name,
          recipientPhone: item.phone,
          recipientPhoto: item.avatar,
          recipientUid: item.uid,
        })}
      >
        <View style={styles.avatarWrapper}>
          {hasStatus && (
            <View style={styles.statusRingOverlay}>
              <StatusRing
                stories={stories}
                viewedStatusIds={viewedStatusIds}
                size={58}
                strokeWidth={2}
                colors={{ primary: COLORS.primary, border: COLORS.border }}
              />
            </View>
          )}
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.chatTime, item.unread > 0 && { color: COLORS.primary, fontWeight: '800' }]}>
              {item.time}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text style={styles.chatMsg} numberOfLines={1}>{item.message}</Text>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [userStatuses, viewedStatusIds, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.onyx} />

      <View style={styles.header}>
        <LinearGradient colors={[COLORS.onyx, COLORS.primary]} style={StyleSheet.absoluteFill} />
        <AnimatedBubbles />

        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.topBar}>
            <Text style={styles.title}>Talkenly</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="search" size={22} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuVisible(true)}>
                <Feather name="more-vertical" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabBar}>
            {TABS.map((tab, index) => (
              <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => handleTabPress(tab, index)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
            <Animated.View
              style={[
                styles.indicator,
                {
                  backgroundColor: COLORS.unreadBadge,
                  transform: [{
                    translateX: scrollX.interpolate({
                      inputRange: [0, width, 2 * width],
                      outputRange: [
                        ((width - 40) / 3 - 30) / 2,
                        (width - 40) / 3 + ((width - 40) / 3 - 30) / 2,
                        2 * (width - 40) / 3 + ((width - 40) / 3 - 30) / 2
                      ]
                    })
                  }]
                }
              ]}
            />
          </View>
        </SafeAreaView>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.dropdownMenu, { backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.05)", borderWidth: 1 }]}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); Alert.alert("Coming Soon", "Feature available in next update."); }}>
                <Text style={[styles.dropdownText, { color: COLORS.white }]}>New group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); navigation.navigate("Settings"); }}>
                <Text style={[styles.dropdownText, { color: COLORS.white }]}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); setLogoutModalVisible(true); }}>
                <Text style={[styles.dropdownText, { color: COLORS.white }]}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dropdownItem, styles.dropdownItemDanger]} onPress={() => { setMenuVisible(false); setDeleteModalVisible(true); }}>
                <Text style={styles.dropdownTextDanger}>Delete account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.body}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveTab(TABS[index]);
          }}
          style={{ flex: 1 }}
        >
          <View style={{ width }}>
            <FlatList
              data={chats}
              keyExtractor={(item) => item.id}
              renderItem={renderChatItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={80} color="rgba(255,255,255,0.05)" />
                  <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>No chats yet. Start messaging!</Text>
                </View>
              }
            />
          </View>
          <View style={{ width }}><StatusScreen /></View>
          <View style={{ width }}><CallsTab /></View>
        </ScrollView>
      </View>

      {activeTab === "Chats" && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 11 + insets.bottom }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Contacts")}
        >
          <MaterialIcons name="chat" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Logout Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Logout</Text>
            <Text style={styles.dialogSub}>Are you sure you want to log out?</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.dialogBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setLogoutModalVisible(false); handleLogout(); }}>
                <Text style={styles.dialogBtnText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={[styles.dialogTitle, { color: "#D32F2F" }]}>Delete Account</Text>
            <Text style={styles.dialogSub}>This will permanently delete ALL your data. This action is irreversible.</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setDeleteModalVisible(false)} disabled={deleteLoading}>
                <Text style={styles.dialogBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={handleDeleteAccount} disabled={deleteLoading}>
                <Text style={[styles.dialogBtnText, { color: "#D32F2F" }]}>{deleteLoading ? "Deleting..." : "Delete"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 180,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    overflow: "hidden",
    backgroundColor: COLORS.primary,
  },
  headerContent: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.white, letterSpacing: -1 },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconBtn: { marginLeft: 20, padding: 4 },
  tabBar: { flexDirection: "row", marginTop: 25, height: 40 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 },
  tabTextActive: { color: COLORS.white },
  indicator: {
    position: "absolute",
    bottom: 0,
    width: 30,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  body: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingBottom: 100, paddingTop: 20 },
  chatItem: { flexDirection: "row", paddingHorizontal: 20, height: 80, alignItems: "center" },
  avatarWrapper: { width: 62, height: 62, justifyContent: "center", alignItems: "center" },
  statusRingOverlay: { position: "absolute", zIndex: 1 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.03)" },
  chatInfo: { flex: 1, marginLeft: 16, height: "100%", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
  chatTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  chatName: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary },
  chatTime: { fontSize: 12, color: COLORS.textSecondary },
  chatBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatMsg: { fontSize: 14, color: COLORS.textSecondary, flex: 1, marginRight: 8 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  unreadText: { color: COLORS.white, fontSize: 11, fontWeight: "900" },
  fab: {
    position: "absolute",
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.unreadBadge,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  dropdownMenu: { position: "absolute", top: 60, right: 20, backgroundColor: COLORS.white, borderRadius: 16, paddingVertical: 8, minWidth: 180, elevation: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
  dropdownItem: { paddingHorizontal: 20, paddingVertical: 12 },
  dropdownText: { fontSize: 16, fontWeight: "600", color: COLORS.textPrimary },
  dropdownItemDanger: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  dropdownTextDanger: { color: "#EF4444", fontWeight: "700" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 20, fontSize: 16, color: COLORS.textSecondary, textAlign: "center", lineHeight: 24 },
  dialogOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  dialogBox: { width: "85%", backgroundColor: "#1E293B", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  dialogTitle: { fontSize: 22, fontWeight: "900", color: COLORS.white, marginBottom: 12 },
  dialogSub: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  dialogBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  dialogBtnText: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
});
