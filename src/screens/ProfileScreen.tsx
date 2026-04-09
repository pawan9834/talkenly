import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { auth, firestore, storage } from '../lib/firebase';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [about, setAbout] = useState<string>('Hey there! I am using Talkenly.');
  const [phone, setPhone] = useState<string>('');

  const [editNameModal, setEditNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  const [editAboutModal, setEditAboutModal] = useState(false);
  const [tempAbout, setTempAbout] = useState('');

  const colors = useMemo(() => ({
    background: isDark ? '#111B21' : '#F0F2F5',
    headerBg: isDark ? '#202C33' : '#008080',
    cardBg: isDark ? '#111B21' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#E9EDEF',
    icon: '#8696A0',
    accent: '#00A884',
    modalBg: isDark ? '#202C33' : '#FFFFFF',
    overlay: 'rgba(0,0,0,0.5)',
  }), [isDark]);

  useEffect(() => {
    if (user) {
      setPhone(user.phoneNumber || '');
      // Fetch fresh profile from firestore
      const fetchProfile = async () => {
        try {
          const doc = await firestore().collection('users').doc(user.uid).get();
          if (doc.exists()) {
            const data = doc.data();
            if (data?.displayName) setName(data.displayName);
            if (data?.photoURL) setPhotoUri(data.photoURL);
            if (data?.about) setAbout(data.about);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      uploadAndSaveImage(uri);
    }
  };

  const uploadAndSaveImage = async (uri: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const reference = storage().ref(`profilePictures/${user.uid}.jpg`);
      await reference.putFile(uri);
      const downloadURL = await reference.getDownloadURL();
      
      await firestore().collection('users').doc(user.uid).update({
        photoURL: downloadURL,
      });
      // Optionally update auth cache
      try {
        await auth().currentUser?.updateProfile({ photoURL: downloadURL });
      } catch (e) {}

      // Update AsyncStorage Cache
      try {
        const cacheKey = `profile_cache_${user.uid}`;
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        const cachedObj = cachedStr ? JSON.parse(cachedStr) : {};
        cachedObj.photoURL = downloadURL;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedObj));
      } catch (e) {}
      
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update profile photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !tempName.trim()) {
      setEditNameModal(false);
      return;
    }
    setLoading(true);
    setEditNameModal(false);
    try {
      const finalName = tempName.trim();
      await firestore().collection('users').doc(user.uid).update({
        displayName: finalName,
      });
      setName(finalName);
      try {
        await auth().currentUser?.updateProfile({ displayName: finalName });
      } catch (e) {}

      // Update AsyncStorage Cache
      try {
        const cacheKey = `profile_cache_${user.uid}`;
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        const cachedObj = cachedStr ? JSON.parse(cachedStr) : {};
        cachedObj.displayName = finalName;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedObj));
      } catch (e) {}
      
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update name.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    if (!user || !tempAbout.trim()) {
      setEditAboutModal(false);
      return;
    }
    setLoading(true);
    setEditAboutModal(false);
    try {
      const finalAbout = tempAbout.trim();
      await firestore().collection('users').doc(user.uid).update({
        about: finalAbout,
      });
      setAbout(finalAbout);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update about.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickImage} disabled={loading}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.headerBg }]}>
                <Ionicons name="person" size={70} color="#FFFFFF" />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name="camera" size={20} color="#FFFFFF" />
            </View>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Name Row */}
        <TouchableOpacity style={[styles.infoRow, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]} onPress={() => { setTempName(name); setEditNameModal(true); }}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-outline" size={24} color={colors.icon} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{name || '...'}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              This is not your username or pin. This name will be visible to your Talkenly contacts.
            </Text>
          </View>
          <Feather name="edit-2" size={20} color={colors.accent} />
        </TouchableOpacity>

        {/* About Row */}
        <TouchableOpacity style={[styles.infoRow, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]} onPress={() => { setTempAbout(about); setEditAboutModal(true); }}>
          <View style={styles.iconContainer}>
            <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>About</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{about}</Text>
          </View>
          <Feather name="edit-2" size={20} color={colors.accent} />
        </TouchableOpacity>

        {/* Phone Row */}
        <View style={[styles.infoRow, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="call-outline" size={24} color={colors.icon} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{phone}</Text>
          </View>
        </View>
      </View>

      {/* Edit Name Modal */}
      <Modal visible={editNameModal} transparent animationType="fade" onRequestClose={() => setEditNameModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Enter your name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              maxLength={25}
              selectionColor={colors.accent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setEditNameModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleSaveName}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit About Modal */}
      <Modal visible={editAboutModal} transparent animationType="fade" onRequestClose={() => setEditAboutModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add About</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
              value={tempAbout}
              onChangeText={setTempAbout}
              autoFocus
              maxLength={139}
              selectionColor={colors.accent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setEditAboutModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleSaveAbout}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
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
  content: { flex: 1 },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarImage: { width: 140, height: 140, borderRadius: 70 },
  avatarPlaceholder: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingOverlay: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  iconContainer: { width: 40, alignItems: 'flex-start', marginTop: 4 },
  textContainer: { flex: 1, paddingRight: 16 },
  label: { fontSize: 14, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  hint: { fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', borderRadius: 8, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { fontSize: 16, borderBottomWidth: 2, paddingBottom: 8, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { marginLeft: 24, paddingVertical: 8, paddingHorizontal: 8 },
  modalBtnText: { fontSize: 15, color: '#00A884', fontWeight: 'bold' },
});