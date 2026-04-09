import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useColorScheme,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { auth, firestore, storage } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { UserProfile } from '../types';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Edit Modals
  const [isNameModalVisible, setNameModalVisible] = useState(false);
  const [isAboutModalVisible, setAboutModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempAbout, setTempAbout] = useState('');

  const colors = {
    background: isDark ? '#111B21' : '#F0F2F5',
    header: isDark ? '#1F2C34' : '#008080',
    card: isDark ? '#1F2C34' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    accent: '#00A884',
    icon: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#233138' : '#F2F2F2',
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          setProfile(data);
          setTempName(data.displayName);
          setTempAbout(data.about || 'Hey there! I am using Talkenly.');
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to profile:', error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri && user) {
      try {
        setUpdating(true);
        const uri = result.assets[0].uri;
        const filename = `profiles/${user.uid}/avatar_${Date.now()}.jpg`;
        const reference = storage().ref(filename);

        await reference.putFile(uri);
        const downloadURL = await reference.getDownloadURL();

        await firestore().collection('users').doc(user.uid).update({
          photoURL: downloadURL,
        });

        Alert.alert('Success', 'Profile picture updated successfully!');
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Failed', 'There was an error updating your profile picture.');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleUpdateName = async () => {
    if (!tempName.trim() || !user) return;
    try {
      setUpdating(true);
      await firestore().collection('users').doc(user.uid).update({
        displayName: tempName.trim(),
      });
      setNameModalVisible(false);
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Could not update name.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateAbout = async () => {
    if (!tempAbout.trim() || !user) return;
    try {
      setUpdating(true);
      await firestore().collection('users').doc(user.uid).update({
        about: tempAbout.trim(),
      });
      setAboutModalVisible(false);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.header }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView 
        style={[styles.content, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            activeOpacity={0.8}
            onPress={handlePickImage}
            disabled={updating}
          >
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.largeAvatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#ccc' }]}>
                <Ionicons name="person" size={100} color="#FFF" />
              </View>
            )}
            {updating && (
              <View style={styles.avatarLoader}>
                <ActivityIndicator color="#FFF" />
              </View>
            )}
            <View style={[styles.cameraBtn, { backgroundColor: colors.accent }]}>
              <Ionicons name="camera" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          {/* Name Field */}
          <View style={styles.fieldSection}>
            <View style={styles.fieldIcon}>
              <Ionicons name="person-outline" size={24} color={colors.icon} />
            </View>
            <View style={[styles.fieldContent, { borderBottomColor: colors.border }]}>
               <View style={styles.fieldHeader}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                  <TouchableOpacity onPress={() => setNameModalVisible(true)}>
                    <MaterialIcons name="edit" size={20} color={colors.accent} />
                  </TouchableOpacity>
               </View>
               <Text style={[styles.value, { color: colors.textPrimary }]}>{profile?.displayName || 'Set Name'}</Text>
               <Text style={[styles.hint, { color: colors.textSecondary }]}>
                 This is not your username or pin. This name will be visible to your Talkenly contacts.
               </Text>
            </View>
          </View>

          {/* About Field */}
          <View style={styles.fieldSection}>
            <View style={styles.fieldIcon}>
              <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
            </View>
            <View style={[styles.fieldContent, { borderBottomColor: colors.border }]}>
               <View style={styles.fieldHeader}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>About</Text>
                  <TouchableOpacity onPress={() => setAboutModalVisible(true)}>
                    <MaterialIcons name="edit" size={20} color={colors.accent} />
                  </TouchableOpacity>
               </View>
               <Text style={[styles.value, { color: colors.textPrimary }]}>
                 {profile?.about || 'Hey there! I am using Talkenly.'}
               </Text>
            </View>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldSection}>
            <View style={styles.fieldIcon}>
              <Ionicons name="call-outline" size={24} color={colors.icon} />
            </View>
            <View style={[styles.fieldContent, { borderBottomWidth: 0 }]}>
               <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
               <Text style={[styles.value, { color: colors.textPrimary }]}>{profile?.phoneNumber || user?.phoneNumber}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isNameModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Enter your name</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              maxLength={25}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                <Text style={[styles.modalBtn, { color: colors.textSecondary }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateName}>
                <Text style={[styles.modalBtn, { color: colors.accent }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit About Modal */}
      <Modal visible={isAboutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add About</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
              value={tempAbout}
              onChangeText={setTempAbout}
              autoFocus
              maxLength={139}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                <Text style={[styles.modalBtn, { color: colors.textSecondary }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateAbout}>
                <Text style={[styles.modalBtn, { color: colors.accent }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  largeAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#F0F2F5', // Matches BG
  },
  detailsSection: {
    paddingTop: 10,
  },
  fieldSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fieldIcon: {
    width: 30,
    paddingTop: 8,
    marginRight: 20,
    alignItems: 'center',
  },
  fieldContent: {
    flex: 1,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 4,
    padding: 24,
    elevation: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    borderBottomWidth: 2,
    paddingVertical: 8,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 30,
  },
  modalBtn: {
    fontSize: 14,
    fontWeight: '700',
  },
});