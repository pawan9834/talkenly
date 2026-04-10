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

export default function SetProfileScreen() {
  const { user, setHasProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    if (!user) return; // Should not happen, guarded by navigation
    
    setLoading(true);
    try {
      if (!user?.phoneNumber) throw new Error('Phone number not found');
      const normalizedPhone = normalizeIndianPhoneNumber(user.phoneNumber);
      if (!normalizedPhone) throw new Error('Invalid phone number format');

      let uploadedPhotoUrl = null;
      if (photoUri) {
        uploadedPhotoUrl = await uploadImage(photoUri, user.uid);
      }

      const userData = {
        uid: user.uid,
        phoneNumber: normalizedPhone,
        displayName: name.trim(),
        photoURL: uploadedPhotoUrl,
        about: 'Hey there! I am using Talkenly.',
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastSeen: firestore.FieldValue.serverTimestamp(),
        isOnline: true,
      };

      await firestore().collection('users').doc(user.uid).set(userData);

      // Now update user local state to trigger navigation to Home
      setHasProfile(true);

    } catch (error: any) {
      console.error('Error creating profile: ', error);
      Alert.alert('Error', error.message || 'Could not create profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile info</Text>
        <Text style={styles.headerSubtitle}>
          Please provide your name and an optional profile photo
        </Text>
      </View>

      <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarCameraText}>📷</Text>
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
        style={[styles.readyBtn, (!name.trim() || loading) && styles.readyBtnDisabled]}
        onPress={handleReadyToChat}
        disabled={!name.trim() || loading}
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
});
