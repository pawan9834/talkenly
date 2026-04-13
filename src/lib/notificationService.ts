import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { auth, Collections } from './firebase';
import { Alert, Platform } from 'react-native';

export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('[Notification] Authorization status:', authStatus);
    await getFcmToken();
  }
};

const getFcmToken = async () => {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      console.log('[Notification] FCM Token:', fcmToken);
      await saveTokenToFirestore(fcmToken);
    }
  } catch (error) {
    console.error('[Notification] Token Fetch Error:', error);
  }
};

const saveTokenToFirestore = async (token: string) => {
  const user = auth().currentUser;
  if (user) {
    try {
      await firestore().collection(Collections.USERS).doc(user.uid).set({
        fcmToken: token,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log('[Notification] Token saved to Firestore');
    } catch (e) {
      console.error('[Notification] Firestore Token Sync Failed:', e);
    }
  }
};

export const setupNotificationListeners = () => {
  // Handle foreground messages
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('[Notification] Foreground Message:', remoteMessage);
    // You can use a local notification library like Notifee here if you want to show a custom alert
  });

  // Handle background / quit state notification clicks
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[Notification] Background Tap:', remoteMessage.notification);
  });

  // Check if app was opened from a quit state via notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('[Notification] Quit State Tap:', remoteMessage.notification);
      }
    });

  return unsubscribe;
};
