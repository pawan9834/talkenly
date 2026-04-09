import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type FirebaseUser = FirebaseAuthTypes.User;

// ─── Navigation ───────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Otp: {
    phoneNumber: string;
    confirmation: FirebaseAuthTypes.ConfirmationResult;
  };
  SetProfile: undefined;
  Home: undefined;
  Chat: { chatId: string; recipientName: string; recipientPhone: string };
  Profile: undefined;
  Contacts: undefined;
  NewChat: undefined;
  Settings: undefined;
};

// ─── Firestore Data Models ────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  phoneNumber: string;
  displayName: string;
  photoURL: string | null;
  about: string;
  createdAt: number;
  lastSeen: number;
  isOnline: boolean;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: number;
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageTime: number;
  lastMessageSenderId: string;
  unreadCount: Record<string, number>;
  createdAt: number;
}