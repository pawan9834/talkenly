import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";
import { auth, Collections } from "./firebase";
import { Alert, Platform } from "react-native";
export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (enabled) {
    await getFcmToken();
  }
};
const getFcmToken = async () => {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await saveTokenToFirestore(fcmToken);
    }
  } catch (error) {
    console.error("[Notification] Token Fetch Error:", error);
  }
};
const saveTokenToFirestore = async (token: string) => {
  const user = auth().currentUser;
  if (user) {
    try {
      await firestore().collection(Collections.USERS).doc(user.uid).update({
        fcmToken: token,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.error("[Notification] Firestore Token Sync Failed:", e);
    }
  }
};
export const setupNotificationListeners = () => {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {});
  messaging().onNotificationOpenedApp((remoteMessage) => {});
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
      }
    });
  return unsubscribe;
};
