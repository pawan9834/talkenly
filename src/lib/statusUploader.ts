import * as ImagePicker from 'expo-image-picker';
import { auth, firestore, storage } from './firebase';
import { normalizeIndianPhoneNumber } from './phoneUtils';

export const pickStatusMedia = async (useCamera: boolean = true) => {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images', 'videos'], // Allow both explicitly
    videoMaxDuration: 30, // Limit to 30s max
    quality: 0.8,
    allowsEditing: true, // Gives standard crop/trim UI
  };

  let result;
  if (useCamera) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to post statuses.');
      return null;
    }
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Gallery permission is required to post statuses.');
      return null;
    }
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  return null;
};

export const uploadStatusMedia = async (asset: any, caption: string = '') => {
  const currentUser = auth().currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
  const userData = userDoc.data();
  
  const rawPhone = currentUser.phoneNumber || userData?.phoneNumber;
  if (!rawPhone) throw new Error('User phone number not found');

  const phoneNumber = normalizeIndianPhoneNumber(rawPhone);
  if (!phoneNumber) throw new Error('Invalid phone number format');

  // Extract name and extension safely
  let filename = asset.uri.substring(asset.uri.lastIndexOf('/') + 1);
  if (!filename.includes('.')) {
    const ext = asset.type === 'video' ? 'mp4' : 'jpg';
    filename = `${filename}.${ext}`;
  }

  const path = `statuses/${currentUser.uid}/${Date.now()}_${filename}`;
  const reference = storage().ref(path);
  
  // Actually upload to Firebase Storage
  await reference.putFile(asset.uri);
  const downloadURL = await reference.getDownloadURL();
  
  // Create document in "statuses" collection
  const statusData = {
    userId: currentUser.uid,
    userName: userData?.displayName || 'Talkenly User',
    userAvatar: userData?.photoURL || currentUser.photoURL || null,
    phoneNumber: phoneNumber,
    mediaUri: downloadURL,
    mediaType: asset.type === 'video' ? 'video' : 'image',
    caption: caption,
    createdAt: firestore.FieldValue.serverTimestamp(),
    viewerUids: [],
  };

  const docRef = await firestore().collection('statuses').add(statusData);
  
  return { id: docRef.id, ...statusData };
};
