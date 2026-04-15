
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { auth, firestore } from '../lib/firebase';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [photo, setPhoto] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string>('Talkenly User');

  const colors = useMemo(() => ({
    background: isDark ? '#111B21' : '#F0F2F5',
    headerBg: isDark ? '#202C33' : '#008080',
    headerText: '#FFFFFF',
    cardBg: isDark ? '#111B21' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#E9EDEF',
    icon: '#8696A0',
    accent: '#00A884',
  }), [isDark]);

  React.useEffect(() => {
    // Attempt to parse existing name or fetch from firestore
    if (user) {
      if (user.displayName) setUserName(user.displayName);
      if (user.photoURL) setPhoto(user.photoURL);

      // Async fetch to get full user profile if needed
      const fetchProfileCached = async () => {
        try {
          const cacheKey = `profile_cache_${user.uid}`;
          const cachedJson = await AsyncStorage.getItem(cacheKey);

          if (cachedJson) {
            // Load from Cache Fast
            const cached = JSON.parse(cachedJson);
            if (cached.displayName) setUserName(cached.displayName);
            if (cached.photoURL) setPhoto(cached.photoURL);
            return; // We hit the cache, no need to touch Firestore!
          }

          // Fallback to Firestore if no cache
          const doc = await firestore().collection('users').doc(user.uid).get();
          if (doc.exists()) {
            const data = doc.data();
            if (data?.displayName) setUserName(data.displayName);
            if (data?.photoURL) setPhoto(data.photoURL);

            // Save to Cache for next time
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              displayName: data?.displayName,
              photoURL: data?.photoURL
            }));
          }
        } catch (e) {
          console.warn(e);
        }
      };

      fetchProfileCached();
    }
  }, [user]);

  const renderSettingItem = (iconName: string, iconType: 'Feather' | 'Ionicons' | 'MaterialIcons', title: string, subtitle?: string, onPress?: () => void) => {
    const IconComponent: any = iconType === 'Feather' ? Feather : iconType === 'Ionicons' ? Ionicons : MaterialIcons;
    return (
      <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]} onPress={onPress}>
        <View style={styles.iconContainer}>
          <IconComponent name={iconName} size={24} color={colors.icon} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, borderBottomWidth: 1 }]}
          onPress={() => navigation.navigate('Profile')}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileAvatarPlaceholder}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{userName}</Text>
            <Text style={[styles.profileStatus, { color: colors.textSecondary }]}>Available</Text>
          </View>
          <Ionicons name="qr-code-outline" size={24} color={colors.accent || '#00A884'} style={styles.qrIcon} />
        </TouchableOpacity>

        {/* Setting Groups */}
        <View style={[styles.settingsGroup, { backgroundColor: colors.cardBg, borderTopColor: colors.border, borderBottomColor: colors.border, borderTopWidth: 1, borderBottomWidth: 1 }]}>
          {renderSettingItem('key-outline', 'Ionicons', 'Account', 'Security notifications, Delete account', () => navigation.navigate('AccountSettings'))}
          {renderSettingItem('lock-closed-outline', 'Ionicons', 'Blocked Contacts', 'Block contacts', () => navigation.navigate('BlockedContacts'))}
          {renderSettingItem('face-man-profile', 'MaterialIcons', 'Avatar', 'Create, edit, profile photo')}
          {renderSettingItem('chatbox-outline', 'Ionicons', 'Chats', 'Theme, wallpapers, chat history')}
        </View>

        <View style={[styles.settingsGroup, { backgroundColor: colors.cardBg, borderTopColor: colors.border, borderBottomColor: colors.border, borderTopWidth: 1, borderBottomWidth: 1 }]}>
          {renderSettingItem('notifications-outline', 'Ionicons', 'Notifications', 'Message, group & call tones')}
          {renderSettingItem('data-usage', 'MaterialIcons', 'Storage and data', 'Network usage, auto-download')}
        </View>

        <View style={[styles.settingsGroup, { backgroundColor: colors.cardBg, borderTopColor: colors.border, borderBottomColor: colors.border, borderTopWidth: 1, borderBottomWidth: 1 }]}>
          {renderSettingItem('help-circle-outline', 'Ionicons', 'Help', 'Help centre, contact us, privacy policy')}
          {renderSettingItem('people-outline', 'Ionicons', 'Invite a friend', undefined, () => {
            // Example interaction
            alert('Invite a friend feature goes here!');
          })}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>from</Text>
          <Text style={[styles.footerBrand, { color: colors.textPrimary }]}>Talkenly</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backBtn: { marginRight: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '500' },
  scrollContent: { paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  profileImage: { width: 64, height: 64, borderRadius: 32 },
  profileAvatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#CCCCCC',
    justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '400', marginBottom: 4 },
  profileStatus: { fontSize: 15 },
  qrIcon: { padding: 8 },
  settingsGroup: { marginBottom: 8 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  iconContainer: { width: 40, alignItems: 'flex-start' },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '400', marginBottom: 2 },
  settingSubtitle: { fontSize: 14 },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 13, marginBottom: 2 },
  footerBrand: { fontSize: 16, fontWeight: '600', letterSpacing: 1 },
});
