import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export { auth, firestore, storage };

// Keep collection names consistent across the whole app
export const Collections = {
  USERS: 'users',
  CHATS: 'chats',
  MESSAGES: 'messages',
} as const;