import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  useColorScheme,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { auth, firestore } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB } from '../lib/database';
import { syncContacts } from '../lib/contactSync';
import { normalizeIndianPhoneNumber } from '../lib/phoneUtils';
import { subscribeUserChats, fetchUserByPhone, markMessagesAsDelivered } from '../lib/chatService';
import { formatStatusTime } from '../lib/timeUtils';
import { getCachedImage } from '../lib/imageHandler';
import StatusScreen from './StatusScreen';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

// Sample Data for UI
// Initial state for chats
const CHATS_INITIAL: any[] = [];

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'Chats' | 'Updates' | 'Calls'>('Chats');
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [chats, setChats] = useState<any[]>(CHATS_INITIAL);
  const [recipientCache, setRecipientCache] = useState<Record<string, any>>({});

  const TABS = ['Chats', 'Updates', 'Calls'] as const;
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleTabPress = (tab: typeof TABS[number], index: number) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  };

  // WhatsApp-inspired Premium Teal Palette
  const colors = {
    background: isDark ? '#111B21' : '#FFFFFF',
    headerBg: isDark ? '#202C33' : '#008080',
    headerText: '#FFFFFF',
    tabText: isDark ? '#8696A0' : '#B2DFDB',
    tabTextActive: isDark ? '#00A884' : '#FFFFFF',
    tabIndicator: isDark ? '#00A884' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#F2F2F2',
    icon: isDark ? '#8696A0' : '#FFFFFF',
    unreadBadge: isDark ? '#00A884' : '#25D366',
    unreadText: isDark ? '#111B21' : '#FFFFFF',
    fabBg: '#00A884',
    statusBar: isDark ? '#202C33' : '#008080',
  };

  useEffect(() => {
    // Initialize DB and Sync Contacts in background
    initDB();
    syncContacts();

    // Preload user profile from Firestore into AsyncStorage
    const preloadProfile = async () => {
      const user = auth().currentUser;
      if (user) {
        try {
          const doc = await firestore().collection('users').doc(user.uid).get();
          if (doc.exists()) {
            const data = doc.data();

            // Self-healing: Normalize phone number in Firestore if needed
            const currentPhone = data?.phoneNumber;
            if (currentPhone && (currentPhone.includes(' ') || !currentPhone.startsWith('+'))) {
              const cleanedPhone = normalizeIndianPhoneNumber(currentPhone);
              if (cleanedPhone && cleanedPhone !== currentPhone) {
                console.log('[Home] Normalizing legacy phone number in Firestore...');
                await firestore().collection('users').doc(user.uid).update({
                  phoneNumber: cleanedPhone
                });
              }
            }

            const cacheKey = `profile_cache_${user.uid}`;
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              displayName: data?.displayName,
              photoURL: data?.photoURL,
              about: data?.about
            }));
          }
        } catch (e) {
          console.warn('[Preload] Failed to cache profile:', e);
        }
      }
    };

    preloadProfile();
  }, []);

  // Real-time Chat Sync
  useEffect(() => {
    const user = auth().currentUser;
    if (!user?.phoneNumber) return;

    const unsubscribe = subscribeUserChats(user.phoneNumber, async (rawChats) => {
      // For each chat, find the recipient Details
      const resolvedChats = await Promise.all(rawChats.map(async (chat) => {
        const otherPhone = chat.participants.find((p: string) => p !== user.phoneNumber);
        if (!otherPhone) return null;

        // Check cache first
        let recipient = recipientCache[otherPhone];
        if (!recipient) {
          recipient = await fetchUserByPhone(otherPhone);
          if (recipient) {
            setRecipientCache(prev => ({ ...prev, [otherPhone]: recipient }));
          }
        }

        // Resolve cache for the avatar
        const avatarUrl = recipient?.photoURL || `https://i.pravatar.cc/150?u=${otherPhone}`;
        const cachedAvatar = await getCachedImage(avatarUrl);

        // Get unread count for current user
        const mySafePhone = user.phoneNumber?.replace(/\+/g, '') || '';
        const unreadCount = chat[`unreadCount_${mySafePhone}`] || 0;

        return {
          id: chat.id,
          name: recipient?.displayName || otherPhone,
          message: chat.lastMessage || 'No messages yet',
          time: formatStatusTime(chat.lastTime),
          unread: unreadCount,
          avatar: cachedAvatar,
          phone: otherPhone,
          uid: recipient?.id || recipient?.uid // Handle both id and uid
        };
      }));

      const filteredChats = resolvedChats.filter(c => c !== null);
      setChats(filteredChats);

      // Global Delivery Pickup: Mark incoming messages as 'delivered' for all active chats
      rawChats.forEach((chat) => {
        markMessagesAsDelivered(chat.id, user.phoneNumber || '');
      });
    });

    return unsubscribe;
  }, [recipientCache]);

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (e) {
      console.error(e);
    }
  };

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('Chat', {
          chatId: item.id,
          recipientName: item.name,
          recipientPhone: item.phone,
          recipientPhoto: item.avatar,
          recipientUid: item.uid
        })
      }
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={[styles.chatInfo, { borderBottomColor: colors.border }]}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.chatTime, { color: item.unread > 0 ? colors.unreadBadge : colors.textSecondary }]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={[styles.chatMsg, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.message}
          </Text>
          {item.unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.unreadBadge }]}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBg }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.statusBar}
        translucent={Platform.OS === 'android'}
      />

      <View style={[styles.main, { backgroundColor: colors.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={styles.title}>Talkenly</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="camera" size={22} color={colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="search" size={22} color={colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuVisible(true)}>
              <Feather name="more-vertical" size={22} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.dropdownMenu, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                  setMenuVisible(false);
                  alert('New Group - Phase 3');
                }}>
                  <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>New group</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                  setMenuVisible(false);
                  alert('Starred messages - Phase 3');
                }}>
                  <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>Starred messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                  setMenuVisible(false);
                  alert('All messages marked as read');
                }}>
                  <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>Read all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Settings');
                }}>
                  <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                  setMenuVisible(false);
                  setLogoutModalVisible(true);
                }}>
                  <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={logoutModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={[styles.dialogBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>Logout</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Are you sure you want to log out?</Text>
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogBtn} onPress={() => setLogoutModalVisible(false)}>
                  <Text style={styles.dialogBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dialogBtn} onPress={() => {
                  setLogoutModalVisible(false);
                  handleLogout();
                }}>
                  <Text style={styles.dialogBtnText}>Log out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* TABS */}
        <View style={[styles.tabBar, { backgroundColor: colors.headerBg }]}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab, index)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? colors.tabTextActive : colors.tabText }
              ]}>
                {tab}
              </Text>
              {activeTab === tab && (
                <View style={[styles.indicator, { backgroundColor: colors.tabIndicator }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* LIST & PAGES */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveTab(TABS[index]);
          }}
          style={{ flex: 1 }}
        >
          {/* CHATS TAB */}
          <View style={{ width }}>
            <FlatList
              data={chats}
              keyExtractor={(item) => item.id}
              renderItem={renderChatItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={80} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No chats yet.{'\n'}Tap the button below to start messaging.
                  </Text>
                </View>
              }
            />
          </View>

          {/* UPDATES TAB */}
          <View style={{ width }}>
            <StatusScreen />
          </View>

          {/* CALLS TAB */}
          <View style={[styles.center, { width }]}>
            <Text style={{ color: colors.textSecondary }}>Calls feature coming soon.</Text>
          </View>
        </ScrollView>

        {/* FAB */}
        {activeTab === 'Chats' && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.fabBg }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Contacts')}
          >
            <MaterialIcons name="chat" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 20,
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    height: 48,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  list: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    paddingLeft: 16,
    height: 76,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ccc',
  },
  chatInfo: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 16,
    marginLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMsg: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdownMenu: { position: 'absolute', top: 50, right: 10, borderRadius: 8, paddingVertical: 8, minWidth: 180, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14 },
  dropdownText: { fontSize: 16 },
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialogBox: { width: '80%', borderRadius: 8, padding: 24, elevation: 5 },
  dialogTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  dialogBtn: { marginLeft: 16, paddingHorizontal: 8, paddingVertical: 4 },
  dialogBtnText: { fontSize: 15, color: '#00A884', fontWeight: 'bold' },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
});
