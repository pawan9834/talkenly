import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  useColorScheme,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { useAuthStore } from "../store/authStore";
import { firestore } from "../lib/firebase";
import { unblockUser } from "../lib/chatService";
type NavProp = NativeStackNavigationProp<RootStackParamList, "BlockedContacts">;
interface BlockedUser {
  phone: string;
  displayName?: string;
  photoURL?: string;
}
export default function BlockedContactsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = useMemo(
    () => ({
      background: isDark ? "#111B21" : "#F0F2F5",
      headerBg: isDark ? "#202C33" : "#008080",
      cardBg: isDark ? "#1F2C34" : "#FFFFFF",
      textPrimary: isDark ? "#E9EDEF" : "#111111",
      textSecondary: isDark ? "#8696A0" : "#667781",
      border: isDark ? "#222D34" : "#E9EDEF",
      accent: "#00A884",
      danger: "#F44336",
    }),
    [isDark],
  );
  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const userDoc = await firestore().collection("users").doc(user.uid).get();
      const blockedPhones: string[] = userDoc.data()?.blockedUsers || [];
      if (blockedPhones.length === 0) {
        setBlockedUsers([]);
        return;
      }
      const profiles: BlockedUser[] = await Promise.all(
        blockedPhones.map(async (phone) => {
          try {
            const snapshot = await firestore()
              .collection("users")
              .where("phoneNumber", "==", phone)
              .limit(1)
              .get();
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data();
              return {
                phone,
                displayName: data.displayName || phone,
                photoURL: data.photoURL || null,
              };
            }
          } catch (_) {}
          return { phone, displayName: phone };
        }),
      );
      setBlockedUsers(profiles);
    } catch (error) {
      console.error("[BlockedContacts] Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);
  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);
  const handleUnblock = (contact: BlockedUser) => {
    Alert.alert(
      "Unblock Contact?",
      `Are you sure you want to unblock ${contact.displayName || contact.phone}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            const success = await unblockUser(contact.phone);
            if (success) {
              setBlockedUsers((prev) =>
                prev.filter((u) => u.phone !== contact.phone),
              );
            } else {
              Alert.alert(
                "Error",
                "Failed to unblock contact. Please try again.",
              );
            }
          },
        },
      ],
    );
  };
  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View
      style={[
        styles.contactRow,
        { backgroundColor: colors.cardBg, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.avatarContainer}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.headerBg },
            ]}
          >
            <FontAwesome5 name="user" size={20} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text
          style={[styles.contactName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.displayName || item.phone}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>
          {item.phone}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.unblockBtn, { borderColor: colors.accent }]}
        onPress={() => handleUnblock(item)}
      >
        <Text style={[styles.unblockText, { color: colors.accent }]}>
          Unblock
        </Text>
      </TouchableOpacity>
    </View>
  );
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      {}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Blocked contacts</Text>
          <Text style={styles.headerSubtitle}>
            {blockedUsers.length} blocked
          </Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="ban-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No blocked contacts
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Contacts you block will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.phone}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backBtn: { marginRight: 20 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "500" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { paddingVertical: 8 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: { marginRight: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "500", marginBottom: 2 },
  contactPhone: { fontSize: 13 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  unblockText: { fontSize: 14, fontWeight: "600" },
});
