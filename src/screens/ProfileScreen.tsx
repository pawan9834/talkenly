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
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../store/authStore';
import { auth, firestore, storage } from '../lib/firebase';
import { getCachedImage } from '../lib/imageHandler';
import { RootStackParamList } from '../types';
import { deleteChat, generateChatId, blockUser, unblockUser } from '../lib/chatService';

const { width } = Dimensions.get('window');
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<ProfileRouteProp>();
  const params = route.params;
  const { user } = useAuthStore();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  // Determine if viewing my own profile
  const isMe = !params?.userId || params?.userId === user?.uid;
  const targetUid = params?.userId || user?.uid;

  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [about, setAbout] = useState<string>('Hey there! I am using Talkenly.');
  const [phone, setPhone] = useState<string>('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);

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
    actionIcon: '#00A884',
    divider: isDark ? '#222D34' : '#E9EDEF',
  }), [isDark]);

  useEffect(() => {
    if (targetUid || params?.phone) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          let doc;
          let phoneNumber = params?.phone;

          if (targetUid) {
            doc = await firestore().collection('users').doc(targetUid).get();
          } else if (params?.phone) {
            const snapshot = await firestore()
              .collection('users')
              .where('phoneNumber', '==', params.phone)
              .limit(1)
              .get();
            if (!snapshot.empty) doc = snapshot.docs[0];
          }

          if (doc && doc.exists()) {
            const data = doc.data();
            if (data?.displayName) setName(data.displayName);
            if (data?.about) setAbout(data.about);
            if (data?.phoneNumber) {
              setPhone(data.phoneNumber);
              phoneNumber = data.phoneNumber;
            }

            if (data?.photoURL) {
              const cached = await getCachedImage(data.photoURL);
              setPhotoUri(cached);
            }
          }

          // 1. Fetch Block Status
          if (!isMe && user?.uid && phoneNumber) {
            const myDoc = await firestore().collection('users').doc(user.uid).get();
            const blockedList = myDoc.data()?.blockedUsers || [];
            setIsBlocked(blockedList.includes(phoneNumber));

            // 2. Fetch Media Count for this chat
            const chatId = generateChatId(user.phoneNumber as string, phoneNumber);
            const mediaSnapshot = await firestore()
              .collection('chats')
              .doc(chatId)
              .collection('messages')
              .where('type', 'in', ['image', 'video'])
              .get();
            setMediaCount(mediaSnapshot.size);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [targetUid, params]);

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
      const originalUri = result.assets[0].uri;

      // OPTIMIZATION: Resize and compress before uploading
      setLoading(true);
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 1000 } }], // Resize to max 1000px width
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setPhotoUri(manipulated.uri);
        uploadAndSaveImage(manipulated.uri);
      } catch (e) {
        console.error('Image manipulation failed', e);
        setPhotoUri(originalUri);
        uploadAndSaveImage(originalUri);
      }
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
      } catch (e) { }

      // Update AsyncStorage Cache
      try {
        const cacheKey = `profile_cache_${user.uid}`;
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        const cachedObj = cachedStr ? JSON.parse(cachedStr) : {};
        cachedObj.photoURL = downloadURL;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedObj));
      } catch (e) { }

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
      } catch (e) { }

      // Update AsyncStorage Cache
      try {
        const cacheKey = `profile_cache_${user.uid}`;
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        const cachedObj = cachedStr ? JSON.parse(cachedStr) : {};
        cachedObj.displayName = finalName;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedObj));
      } catch (e) { }

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

  const handleToggleBlock = async () => {
    if (!phone) return;

    const action = isBlocked ? 'unblock' : 'block';

    Alert.alert(
      `${isBlocked ? 'Unblock' : 'Block'} ${name}?`,
      `Are you sure you want to ${action} this contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            setLoading(true);
            const success = isBlocked ? await unblockUser(phone) : await blockUser(phone);
            setLoading(false);
            if (success) {
              setIsBlocked(!isBlocked);
            } else {
              Alert.alert('Error', `Failed to ${action} user.`);
            }
          }
        }
      ]
    );
  };

  const navigateToMediaGallery = () => {
    if (!user?.phoneNumber || !phone) return;
    const chatId = generateChatId(user.phoneNumber, phone);
    // @ts-ignore
    navigation.navigate('MediaLinksDocs', {
      chatId,
      recipientName: name || phone,
    });
  };
  const handleDeleteChat = () => {
    if (!user?.phoneNumber || !phone) {
      Alert.alert('Error', 'Could not identify chat session.');
      return;
    }

    Alert.alert(
      'Delete Chat?',
      'Are you sure you want to permanently delete this entire chat and all its messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const chatId = generateChatId(user.phoneNumber as string, phone);
            const success = await deleteChat(chatId);
            setLoading(false);
            if (success) {
              // Return to the previous screen (Home or Chat)
              navigation.goBack();
            } else {
              Alert.alert('Error', 'Failed to delete chat.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageHeader}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.largeAvatar} />
          ) : (
            <View style={[styles.largeAvatarPlaceholder, { backgroundColor: colors.headerBg }]}>
              <Ionicons name="person" size={120} color="#FFFFFF" />
            </View>
          )}

          {/* Overlay Buttons */}
          <SafeAreaView style={styles.topFixedHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {!isMe && (
              <TouchableOpacity style={styles.headerIconButton}>
                <Feather name="more-vertical" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </SafeAreaView>

          {isMe && (
            <TouchableOpacity
              style={[styles.floatingEditBtn, { backgroundColor: colors.accent }]}
              onPress={handlePickImage}
              disabled={loading}
            >
              <Ionicons name="camera" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={styles.nameHeaderContainer}>
            <Text style={styles.largeNameText}>{name || '...'}</Text>
            <Text style={styles.largePhoneText}>{phone}</Text>
          </View>
        </View>

        {/* Action Bar */}
        {!isMe && (
          <View style={[styles.actionBar, { backgroundColor: colors.cardBg }]}>
            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.goBack()}>
              <Ionicons name="chatbubble-ellipses" size={24} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="call" size={24} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <MaterialCommunityIcons name="video" size={28} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Coming Soon', 'User status viewing is coming soon!')}>
              <Ionicons name="radio-outline" size={24} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Status</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.detailsContent}>
          {/* About & Phone Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.cardItem}
              onPress={() => { if (isMe) { setTempAbout(about); setEditAboutModal(true); } }}
              activeOpacity={isMe ? 0.7 : 1}
            >
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{about}</Text>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  {isMe ? 'About' : 'Status'}
                </Text>
              </View>
              {isMe && <Feather name="edit-2" size={18} color={colors.accent} />}
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.cardItem}>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{phone}</Text>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Phone Number</Text>
              </View>
              <View style={styles.phoneIconRow}>
                <Ionicons name="call" size={20} color={colors.accent} style={{ marginRight: 20 }} />
                <Ionicons name="chatbubble" size={20} color={colors.accent} />
              </View>
            </View>
          </View>

          {/* Media Section */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, marginTop: 12 }]}>
            <TouchableOpacity style={styles.cardItem} onPress={navigateToMediaGallery}>
              <MaterialIcons name="perm-media" size={22} color={colors.icon} />
              <View style={[styles.cardTextContainer, { marginLeft: 16 }]}>
                <Text style={[styles.cardValue, { fontSize: 16, color: colors.textPrimary }]}>Media, links, and docs</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ color: colors.textSecondary, marginRight: 8 }}>{mediaCount}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.icon} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Groups (Mock) */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Groups in common</Text>
            <TouchableOpacity style={styles.cardItem}>
              <View style={[styles.groupAvatar, { backgroundColor: colors.headerBg }]}>
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>
              <View style={[styles.cardTextContainer, { marginLeft: 16 }]}>
                <Text style={[styles.cardValue, { fontSize: 16, color: colors.textPrimary }]}>Talkenly Devs</Text>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Pawan, Roshan, You</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Delete/Block Options */}
          {!isMe && (
            <View style={{ marginTop: 24, paddingBottom: 40 }}>
              <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteChat}>
                <Ionicons name="trash" size={24} color="#F44336" />
                <Text style={styles.dangerText}>Delete Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerItem} onPress={handleToggleBlock}>
                <Ionicons name="ban" size={24} color="#F44336" />
                <Text style={styles.dangerText}>{isBlocked ? `Unblock ${name}` : `Block ${name}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerItem}>
                <Ionicons name="thumbs-down" size={24} color="#F44336" />
                <Text style={styles.dangerText}>Report {name}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals for Editing (Simplified) */}
      <Modal visible={editAboutModal} transparent animationType="fade" onRequestClose={() => setEditAboutModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit About</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageHeader: {
    width: width,
    height: width * 0.9,
    position: 'relative',
    backgroundColor: '#000',
  },
  largeAvatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.8,
  },
  largeAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topFixedHeader: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    zIndex: 10,
  },
  headerIconButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  floatingEditBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 15,
  },
  nameHeaderContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 10,
  },
  largeNameText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  largePhoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  actionItem: {
    alignItems: 'center',
    width: width / 4,
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  detailsContent: {
    paddingTop: 12,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginLeft: 0,
  },
  phoneIconRow: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dangerText: {
    color: '#F44336',
    fontSize: 17,
    marginLeft: 16,
    fontWeight: '500',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', borderRadius: 8, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { fontSize: 16, borderBottomWidth: 2, paddingBottom: 8, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { marginLeft: 24, paddingVertical: 8, paddingHorizontal: 8 },
  modalBtnText: { fontSize: 15, color: '#00A884', fontWeight: 'bold' },
});