import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Platform,
  Share,
  DeviceEventEmitter,
  Modal,
  TouchableWithoutFeedback,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import {
  fetchLocalContacts,
  fetchContactsByRegistration,
  LocalContact,
} from "../lib/database";
import { auth, firestore } from "../lib/firebase";
import { generateChatId } from "../lib/chatService";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";
type NavProp = NativeStackNavigationProp<RootStackParamList, "Contacts">;
const ITEM_HEIGHT = 72;
const ContactItem = React.memo(
  ({
    item,
    colors,
    onPress,
    onInvite,
  }: {
    item: LocalContact;
    colors: any;
    onPress: (contact: LocalContact) => void;
    onInvite?: (contact: LocalContact) => void;
  }) => {
    let initials = "?";
    if (item.name) {
      const parts = item.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else {
        initials = item.name.substring(0, 1).toUpperCase();
      }
    }
    const isRegistered = item.isRegistered === 1;
    const avatarUri = item.photoURL || item.imageUri;
    return (
      <TouchableOpacity
        style={styles.contactItem}
        activeOpacity={0.7}
        onPress={() =>
          isRegistered ? onPress(item) : onInvite ? onInvite(item) : null
        }
      >
        <View
          style={[styles.avatarContainer, { backgroundColor: colors.border }]}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <Text style={[styles.initials, { color: colors.textSecondary }]}>
              {initials}
            </Text>
          )}
        </View>
        <View
          style={[styles.contactInfo, { borderBottomColor: colors.border }]}
        >
          <View style={styles.contactMain}>
            <Text
              style={[styles.contactName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[styles.contactPhone, { color: colors.textSecondary }]}
            >
              {item.phoneNumber || item.normalizedPhone}
            </Text>
          </View>
          {!isRegistered && (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => onInvite?.(item)}
            >
              <Text style={styles.inviteText}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  },
);
export default function ContactsScreen() {
  const navigation = useNavigation<NavProp>();
  const isFocused = useIsFocused();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const [registeredContacts, setRegisteredContacts] = useState<LocalContact[]>(
    [],
  );
  const [inviteContacts, setInviteContacts] = useState<LocalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const colors = useMemo(
    () => ({
      background: "#0F172A",
      headerBg: "#0F172A",
      headerText: "#FFFFFF",
      textPrimary: "#FFFFFF",
      textSecondary: "#94A3B8",
      border: "rgba(255,255,255,0.05)",
      icon: "#94A3B8",
      statusBar: "#0F172A",
      searchBg: "#1E293B",
      accent: "#FF6B00",
    }),
    [],
  );
  const loadContacts = useCallback(async (query: string = "") => {
    try {
      setLoading(true);
      const [registered, invite] = await Promise.all([
        fetchContactsByRegistration(1, query),
        fetchContactsByRegistration(0, query),
      ]);
      const currentUserNumber = auth().currentUser?.phoneNumber;
      const currentUserUid = auth().currentUser?.uid;
      let finalRegistered = [...registered];
      if (currentUserNumber && query.trim() === "") {
        let fallbackPhoto: string | undefined =
          auth().currentUser?.photoURL || undefined;
        if (!fallbackPhoto && currentUserUid) {
          try {
            const userDoc = await firestore()
              .collection("users")
              .doc(currentUserUid)
              .get();
            if (userDoc.exists()) {
              fallbackPhoto = userDoc.data()?.photoURL;
            }
          } catch (e) {
            console.error("Failed to grab self photo:", e);
          }
        }
        finalRegistered = finalRegistered.filter(
          (c) => c.normalizedPhone !== currentUserNumber,
        );
        finalRegistered.unshift({
          id: "current-user-self",
          name: "You (Message yourself)",
          phoneNumber: currentUserNumber,
          normalizedPhone: currentUserNumber,
          isRegistered: 1,
          photoURL: fallbackPhoto,
        });
      }
      setRegisteredContacts(finalRegistered);
      setInviteContacts(invite);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadContacts]);
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  const handleContactPress = useCallback(
    (contact: LocalContact) => {
      const myPhone = auth().currentUser?.phoneNumber;
      if (!myPhone) return;
      const deterministicChatId = generateChatId(
        myPhone,
        contact.normalizedPhone,
      );
      navigation.navigate("Chat", {
        chatId: deterministicChatId,
        recipientName: contact.name,
        recipientPhone: contact.normalizedPhone,
        recipientPhoto: contact.photoURL || contact.imageUri,
        recipientUid: contact.uid,
      });
    },
    [navigation],
  );
  useEffect(() => {
    if (!isFocused) return;
    const syncListener = DeviceEventEmitter.addListener(
      "contacts_synced",
      () => {
        loadContacts(searchQuery);
      },
    );
    return () => {
      syncListener.remove();
    };
  }, [isFocused, searchQuery, loadContacts]);
  const handleInvite = useCallback(async (contact: LocalContact) => {
    try {
      await Share.share({
        message: `Hey ${contact.name}! Let's chat on Talkenly. Download it here: https://talkenly.com/download`,
      });
    } catch (error) {
      console.error("Sharing failed:", error);
    }
  }, []);
  const sections = useMemo(
    () =>
      [
        { title: "Contacts on Talkenly", data: registeredContacts },
        { title: "Invite to Talkenly", data: inviteContacts },
      ].filter((section) => section.data.length > 0),
    [registeredContacts, inviteContacts],
  );
  const renderSectionHeader = ({ section: { title } }: any) => (
    <View
      style={[styles.sectionHeader, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.statusBar} />
      <View style={styles.headerContainer}>
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFill} />
        <AnimatedBubbles />
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Select Contact</Text>
            <Text style={styles.headerSubtitle}>
              {registeredContacts.length + inviteContacts.length} contacts
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => setMenuVisible(true)}
        >
          <Feather name="more-vertical" size={22} color="#FFFFFF" />
        </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.dropdownMenu,
                { backgroundColor: colors.background },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setMenuVisible(false);
                  setLoading(true);
                  loadContacts(searchQuery);
                }}
              >
                <Text
                  style={[styles.dropdownText, { color: colors.textPrimary }]}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setMenuVisible(false);
                  if (Platform.OS === "android") {
                    Linking.openURL("content://contacts/people/").catch(() => {
                      alert("Could not open Contacts app");
                    });
                  } else {
                    alert("Open System Contacts");
                  }
                }}
              >
                <Text
                  style={[styles.dropdownText, { color: colors.textPrimary }]}
                >
                  Contacts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setMenuVisible(false);
                  Share.share({
                    message: `Join me on Talkenly! An amazing new chat app. https://talkenly.com/download`,
                  });
                }}
              >
                <Text
                  style={[styles.dropdownText, { color: colors.textPrimary }]}
                >
                  Invite a friend
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setMenuVisible(false);
                  alert(
                    "Contacts Help\n\nRegistered Talkenly users appear automatically at the top. Use the search bar to find anyone quickly.",
                  );
                }}
              >
                <Text
                  style={[styles.dropdownText, { color: colors.textPrimary }]}
                >
                  {" "}
                  Help
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <View style={styles.searchContainer}>
          <View
            style={[styles.searchBar, { backgroundColor: colors.searchBg }]}
          >
            <Ionicons
              name="search"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search contacts..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ContactItem
                item={item}
                colors={colors}
                onPress={handleContactPress}
                onInvite={handleInvite}
              />
            )}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons
                  name="people-outline"
                  size={64}
                  color={colors.border}
                />
                <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
                  No contacts found
                </Text>
              </View>
            }
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
  },
  headerSafeArea: {
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 8, marginRight: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "#FFFFFF", fontSize: 12, opacity: 0.9 },
  headerIcon: { padding: 10 },
  content: { flex: 1 },
  searchContainer: { padding: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { paddingBottom: 20 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: ITEM_HEIGHT,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  initials: { fontSize: 20, fontWeight: "600" },
  contactInfo: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactMain: { flex: 1, justifyContent: "center" },
  contactName: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  contactPhone: { fontSize: 14 },
  inviteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FF6B00",
  },
  inviteText: { color: "#FF6B00", fontSize: 13, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  dropdownMenu: {
    position: "absolute",
    top: 50,
    right: 10,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 180,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14 },
  dropdownText: { fontSize: 16 },
});
