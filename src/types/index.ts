import { FirebaseAuthTypes } from "@react-native-firebase/auth";
export type FirebaseUser = FirebaseAuthTypes.User;
export type RootStackParamList = {
  Login: undefined;
  Otp: {
    phoneNumber: string;
    confirmation: FirebaseAuthTypes.ConfirmationResult;
  };
  SetProfile: undefined;
  Home: undefined;
  Chat: {
    chatId: string;
    recipientName: string;
    recipientPhone: string;
    recipientPhoto?: string | null;
    recipientUid?: string;
  };
  Profile:
    | {
        userId?: string;
        name?: string;
        photo?: string;
        phone?: string;
        about?: string;
      }
    | undefined;
  Contacts: undefined;
  NewChat: undefined;
  Settings: undefined;
  AccountSettings: undefined;
  BlockedContacts: undefined;
  MediaLinksDocs: { chatId: string; recipientName: string };
  MyStatusDetails: undefined;
  StatusMediaEditor: { asset: any };
  StarredMessages: undefined;
  ImageViewer: {
    mediaMessages: any[];
    initialIndex: number;
    recipientName: string;
  };
  ZegoUIKitPrebuiltCallWaitingScreen: any;
  ZegoUIKitPrebuiltCallInCallScreen: any;
  Legal: { type: "terms" | "privacy" };
};
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
  type:
    | "text"
    | "image"
    | "audio"
    | "video"
    | "location"
    | "contact"
    | "liveLocation"
    | "deleted";
  mediaUrl?: string;
  mediaType?: "image" | "video";
  fileSize?: number;
  fileName?: string;
  duration?: number | null;
  status: "sent" | "delivered" | "read";
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
