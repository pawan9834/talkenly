import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  useColorScheme,
  StatusBar,
  Alert,
  Linking,
  TextInput,
  RefreshControl,
  Image,
  Platform,
  Share,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, UserProfile } from '../types';
import InviteBottomSheet from '../components/InviteBottomSheet';
import { openNativeContacts, inviteAFriend } from '../utils/contactActions';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Contacts'>;

const CONTACTS_CACHE_KEY = '@talkenly_contacts_cache';

// Section data types
interface RegisteredContactItem {
  type: 'registered';
  contact: Contacts.Contact;
  userData: UserProfile;
}

interface UnregisteredContactItem {
  type: 'unregistered';
  contact: Contacts.Contact;
}

type ContactItem = RegisteredContactItem | UnregisteredContactItem;

interface Section {
  title: string;
  data: ContactItem[];
}

export default function ContactsScreen() {
  const navigation = useNavigation<NavProp>();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite Bottom Sheet State
  const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{ name: string; phone: string } | null>(null);

  // Menu State
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const colors = {
    background: isDark ? '#111B21' : '#FFFFFF',
    headerBg: isDark ? '#1F2C34' : '#008080',
    headerText: '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    icon: '#FFFFFF',
    border: isDark ? '#202C33' : '#F2F2F2',
    avatarBg: isDark ? '#233138' : '#E1E1E1',
    avatarText: isDark ? '#8696A0' : '#FFFFFF',
    inviteText: '#008080',
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0).toUpperCase()}${parts[parts.length - 1].charAt(0).toUpperCase()}`;
  };

  const normalizePhone = (phone: string): string => {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('091')) return `+${cleaned.slice(1)}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) return `+91${cleaned}`;
    return cleaned;
  };

  const saveToCache = async (data: Section[]) => {
    try {
      await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save contacts to cache', e);
    }
  };

  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
      if (cached) {
        setSections(JSON.parse(cached));
        setLoading(false);
      }
    } catch (e) {
      console.error('Failed to load contacts from cache', e);
    }
  };

  const fetchContacts = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        Alert.alert('Permission Denied', 'Allow access to contacts to chat with them.');
        return;
      }

      const { data: allContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        sort: Contacts.SortTypes.FirstName,
      });

      if (allContacts.length === 0) {
        setSections([]);
        setLoading(false);
        return;
      }

      // Step 1: Normalize numbers for Firestore lookup
      const normalizedPhones: string[] = [];
      allContacts.forEach(contact => {
        contact.phoneNumbers?.forEach(pn => {
          if (pn.number) {
            const normalized = normalizePhone(pn.number);
            if (normalized && !normalizedPhones.includes(normalized)) {
              normalizedPhones.push(normalized);
            }
          }
        });
      });

      // Step 2: Batched Firestore Query
      const registeredUsersMap = new Map<string, UserProfile>();
      const batchSize = 30;
      for (let i = 0; i < normalizedPhones.length; i += batchSize) {
        const batch = normalizedPhones.slice(i, i + batchSize);
        const q = await firestore()
          .collection('users')
          .where('phoneNumber', 'in', batch)
          .get();

        q.forEach(doc => {
          const data = doc.data() as UserProfile;
          registeredUsersMap.set(data.phoneNumber, data);
        });
      }

      // Step 3: Categorize
      const registeredItems: RegisteredContactItem[] = [];
      const unregisteredItems: UnregisteredContactItem[] = [];
      const processedIds = new Set<string>();

      allContacts.forEach(contact => {
        const id = (contact as any).id || (contact as any).lookupKey || Math.random().toString();
        if (processedIds.has(id)) return;
        processedIds.add(id);

        let registeredData: UserProfile | null = null;
        contact.phoneNumbers?.forEach(pn => {
          if (pn.number) {
            const norm = normalizePhone(pn.number);
            if (registeredUsersMap.has(norm)) registeredData = registeredUsersMap.get(norm)!;
          }
        });

        if (registeredData) {
          registeredItems.push({ type: 'registered', contact, userData: registeredData });
        } else {
          unregisteredItems.push({ type: 'unregistered', contact });
        }
      });

      const builtSections: Section[] = [];
      if (registeredItems.length > 0) builtSections.push({ title: 'Contacts on Talkenly', data: registeredItems });
      if (unregisteredItems.length > 0) builtSections.push({ title: 'Invite to Talkenly', data: unregisteredItems });

      setSections(builtSections);
      saveToCache(builtSections);

    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFromCache();
    fetchContacts(true); // Always sync in background
  }, []);

  const onRefresh = useCallback(() => {
    setIsMenuVisible(false);
    setRefreshing(true);
    fetchContacts();
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase().trim();
    return sections.map(section => ({
      ...section,
      data: section.data.filter(item => {
        const name = item.type === 'registered' ? item.userData.displayName : (item.contact.name || '');
        const phone = item.type === 'registered' ? item.userData.phoneNumber : (item.contact.phoneNumbers?.[0]?.number || '');
        return name.toLowerCase().includes(query) || phone.includes(query);
      })
    })).filter(s => s.data.length > 0);
  }, [sections, searchQuery]);

  const sendInvite = async (phoneNumber: string, contactName: string) => {
    const inviteMessage = `Hey ${contactName}, join me on Talkenly! It's fast, simple and secure. Download here: https://yourapp.com/download`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(inviteMessage)}`;
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) await Linking.openURL(smsUrl);
      else Alert.alert('Error', 'Unable to open SMS app.');
    } catch (e) {
      Alert.alert('Error', 'Failed to send invite.');
    }
  };

  const renderItem = useCallback(({ item }: { item: ContactItem }) => {
    if (item.type === 'registered') {
      const { userData, contact } = item;
      const displayName = userData.displayName || contact.name || 'Unknown';
      return (
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => navigation.navigate('Chat', { chatId: `temp_${userData.uid}`, recipientName: displayName, recipientPhone: userData.phoneNumber })}
        >
          {userData.photoURL ? (
            <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
              <Text style={[styles.avatarText, { color: colors.avatarText }]}>{getInitials(displayName)}</Text>
            </View>
          )}
          <View style={[styles.contactInfo, { borderBottomColor: colors.border }]}>
            <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{userData.phoneNumber}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const { contact } = item;
    const phone = contact.phoneNumbers?.[0]?.number || '';
    const name = contact.name || 'Unknown';
    return (
      <TouchableOpacity style={styles.contactItem} activeOpacity={0.7} onPress={() => {
        setSelectedContact({ name, phone });
        setInviteSheetVisible(true);
      }}>
        <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
          <Text style={[styles.avatarText, { color: colors.avatarText }]}>{getInitials(name)}</Text>
        </View>
        <View style={[styles.contactInfo, { borderBottomColor: colors.border }]}>
          <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{phone || 'No phone number'}</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteBtn}

        >
          <Text style={[styles.inviteText, { color: colors.inviteText }]}>Invite</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [colors, navigation]);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
      {isSearchMode ? (
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => { setIsSearchMode(false); setSearchQuery(''); }}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
          </TouchableOpacity>
          <TextInput
            style={[styles.searchInput, { color: colors.headerText }]}
            placeholder="Search..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      ) : (
        <>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.icon} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>Select contact</Text>
              <Text style={styles.subtitle}>{sections.reduce((a, s) => a + s.data.length, 0)} contacts</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSearchMode(true)}>
              <Ionicons name="search" size={22} color={colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginLeft: 20 }}
              onPress={() => setIsMenuVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* DROPDOWN MENU */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <View style={[styles.menuContent, { backgroundColor: isDark ? '#233138' : '#FFFFFF' }]}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => { setIsMenuVisible(false); inviteAFriend(); }}
              >
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Invite a friend</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => { setIsMenuVisible(false); openNativeContacts(); }}
              >
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Contacts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={onRefresh}>
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => { setIsMenuVisible(false); navigation.navigate('Help'); }}
              >
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.headerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}

        {loading && sections.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#008080" /></View>
        ) : filteredSections.length === 0 ? (
          <View style={styles.center}><Text style={{ color: colors.textSecondary }}>No contacts found</Text></View>
        ) : (
          <SectionList
            sections={filteredSections}
            keyExtractor={(item) => (item.type === 'registered' ? item.userData.uid : (item.contact as any).id || Math.random().toString())}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
              </View>
            )}
            removeClippedSubviews={Platform.OS === 'android'}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#008080" colors={['#008080']} />}
          />
        )}

        {selectedContact && (
          <InviteBottomSheet
            visible={inviteSheetVisible}
            onClose={() => setInviteSheetVisible(false)}
            onInvite={() => { setInviteSheetVisible(false); sendInvite(selectedContact.phone, selectedContact.name); }}
            contactName={selectedContact.name}
            phoneNumber={selectedContact.phone}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerText: { marginLeft: 24 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  subtitle: { color: '#FFF', fontSize: 12, opacity: 0.9 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 24, fontSize: 18, paddingVertical: 0 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  contactItem: { flexDirection: 'row', paddingHorizontal: 16, height: 72, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  contactInfo: { flex: 1, marginLeft: 16, height: '100%', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  contactName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  contactPhone: { fontSize: 13 },
  inviteBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#008080' },
  inviteText: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 50 : 100,
    paddingRight: 10,
  },
  menuContent: {
    width: 180,
    borderRadius: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingVertical: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
  },
});
