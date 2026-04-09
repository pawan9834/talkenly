import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/authStore';
import type { UserProfile, RootStackParamList } from '../types';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const colors = {
    background: isDark ? '#111B21' : '#F0F2F5',
    header: isDark ? '#1F2C34' : '#008080',
    card: isDark ? '#111B21' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    icon: isDark ? '#8696A0' : '#667781',
    accent: '#00A884',
    border: isDark ? '#233138' : '#F2F2F2',
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to profile:', error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    IconComponent = Ionicons 
  }: { 
    icon: any, 
    title: string, 
    subtitle: string,
    IconComponent?: any
  }) => (
    <TouchableOpacity style={styles.item} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <IconComponent name={icon} size={24} color={colors.icon} />
      </View>
      <View style={[styles.itemTextContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.header }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView 
        style={[styles.content, { backgroundColor: isDark ? '#111B21' : '#FFFFFF' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity 
          style={[styles.profileCard, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Profile')}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#ccc' }]}>
              <Ionicons name="person" size={40} color="#FFF" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {profile?.displayName || 'Set Name...'}
            </Text>
            <Text style={[styles.profileStatus, { color: colors.textSecondary }]} numberOfLines={1}>
              {profile?.about || 'Hey there! I am using Talkenly.'}
            </Text>
          </View>
          <Ionicons name="qr-code-outline" size={24} color={colors.accent} />
        </TouchableOpacity>

        {/* Settings List */}
        <SettingItem 
          icon="key-outline" 
          title="Account" 
          subtitle="Security notifications, change number" 
        />
        <SettingItem 
          icon="lock-closed-outline" 
          title="Privacy" 
          subtitle="Block contacts, disappearing messages" 
        />
        <SettingItem 
          icon="chatbox-outline" 
          title="Chats" 
          subtitle="Theme, wallpapers, chat history" 
        />
        <SettingItem 
          icon="notifications-outline" 
          title="Notifications" 
          subtitle="Message, group & call tones" 
        />
        <SettingItem 
          icon="data-usage" 
          title="Storage and Data" 
          subtitle="Network usage, auto-download" 
          IconComponent={MaterialCommunityIcons}
        />
        <SettingItem 
          icon="language" 
          title="App Language" 
          subtitle="English (phone's language)" 
          IconComponent={MaterialIcons}
        />
        <SettingItem 
          icon="help-circle-outline" 
          title="Help" 
          subtitle="Help Center, contact us, privacy policy" 
        />
        <SettingItem 
          icon="people-outline" 
          title="Invite a friend" 
          subtitle="" 
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>from</Text>
          <Text style={[styles.footerBrand, { color: colors.textPrimary }]}>TALKENLY</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    height: 72,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    marginLeft: 12,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
  },
  footer: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
