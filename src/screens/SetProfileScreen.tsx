import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useAuthStore } from '../store/authStore';
import { normalizeIndianPhoneNumber } from '../lib/phoneUtils';
import { requestUserPermission } from '../lib/notificationService';

export default function SetProfileScreen() {
  const { user, setHasProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

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
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string, uid: string): Promise<string> => {
    const reference = storage().ref(`profilePictures/${uid}.jpg`);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const handleReadyToChat = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }

    if (!photoUri) {
      Alert.alert('Photo Required', 'Please select a profile photo to continue.');
      return;
    }

    if (!user) return;
    
    setLoading(true);
    try {
      if (!user?.phoneNumber) throw new Error('Phone number not found');
      const normalizedPhone = normalizeIndianPhoneNumber(user.phoneNumber);
      if (!normalizedPhone) throw new Error('Invalid phone number format');

      console.log('[SetProfile] Uploading image...');
      let uploadedPhotoUrl = '';
      try {
        uploadedPhotoUrl = await uploadImage(photoUri, user.uid);
      } catch (uploadError: any) {
        console.error('[SetProfile] Storage Upload Error:', uploadError);
        throw new Error(`Media Upload Failed: ${uploadError.message || 'Check your internet or Storage rules'}`);
      }
      
      console.log('[SetProfile] Image uploaded:', uploadedPhotoUrl);

      // 1. Update Firebase Auth Profile (Sync)
      console.log('[SetProfile] Updating Auth profile...');
      try {
        await user.updateProfile({
          displayName: name.trim(),
          photoURL: uploadedPhotoUrl,
        });
      } catch (authError: any) {
        console.error('[SetProfile] Auth Profile Update Error:', authError);
        // We can continue even if this fails as Firestore is the primary source
      }

      // 2. Update Firestore document
      console.log('[SetProfile] Writing to Firestore...');
      const serverTimestamp = firestore.FieldValue.serverTimestamp();
      
      const userData = {
        uid: user.uid,
        phoneNumber: normalizedPhone,
        displayName: name.trim(),
        photoURL: uploadedPhotoUrl,
        about: 'Hey there! I am using Talkenly.',
        createdAt: serverTimestamp,
        lastSeen: serverTimestamp,
        isOnline: true,
      };

      try {
        await firestore().collection('users').doc(user.uid).set(userData);
      } catch (fsError: any) {
        console.error('[SetProfile] Firestore Write Error:', fsError);
        throw new Error(`Profile Save Failed: ${fsError.message || 'Check your database permissions'}`);
      }
      
      console.log('[SetProfile] Firestore write successful');

      // 3. Register push notification token
      requestUserPermission();

      // 4. Show success state for a moment
      setSuccess(true);
      console.log('[SetProfile] Profile set successfully, navigating in 2s');
      
      setTimeout(() => {
        setHasProfile(true);
      }, 2000);

    } catch (error: any) {
      console.error('[SetProfile] Error creating profile:', error);
      Alert.alert('Setup Failed', error.message || 'Could not create profile. Try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Welcome, {name}!</Text>
        <Text style={styles.successText}>Your profile is all set.</Text>
        <ActivityIndicator color="#075E54" size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile info</Text>
        <Text style={styles.headerSubtitle}>
          Please provide your name and a profile photo
        </Text>
      </View>

      <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarCameraText}>📷</Text>
            <Text style={styles.addPhotoText}>ADD PHOTO</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your name here"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
          autoFocus={false}
          maxLength={25}
        />
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.readyBtn, (!name.trim() || !photoUri || loading) && styles.readyBtnDisabled]}
        onPress={handleReadyToChat}
        disabled={!name.trim() || !photoUri || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.readyBtnText}>Ready to Chat</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#075E54', // WhatsApp/Premium theme green
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraText: {
    fontSize: 40,
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#075E54',
    marginTop: 4,
  },
  inputContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#075E54',
    paddingBottom: 8,
    marginBottom: 20,
  },
  input: {
    fontSize: 18,
    color: '#000',
  },
  readyBtn: {
    backgroundColor: '#075E54',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  readyBtnDisabled: {
    backgroundColor: '#a3c9c4',
  },
  readyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#075E54',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
});
