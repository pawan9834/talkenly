import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { requestUserPermission, setupNotificationListeners } from './src/lib/notificationService';
import { initLocationService } from './src/lib/locationService';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onUserLogin, onUserLogout, ZegoUIKitPrebuiltCallService } from './src/lib/zegoService';
import { Platform } from 'react-native';
import * as ZIM from 'zego-zim-react-native';
import * as ZPNs from 'zego-zpns-react-native';

// Use system calling UI for better background call handling
ZegoUIKitPrebuiltCallService.useSystemCallingUI([ZIM, ZPNs]);

export default function App() {
  const { setUser, setLoading, setHasProfile, loading, hasProfile, user } = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      console.log('[App] Auth state changed, user:', firebaseUser?.uid);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check if this user already has a Firestore profile
        try {
          console.log('[App] Checking Firestore profile for:', firebaseUser.uid);
          const doc = await firestore().collection('users').doc(firebaseUser.uid).get();
          const userData = doc.data();
          console.log('[App] Firestore document exists:', doc.exists);
          
          // Only consider the profile "complete" if it has a displayName.
          // This prevents "stub" documents (created by notification service) from skipping the setup screen.
          if (doc.exists && userData?.displayName) {
            console.log('[App] Profile is complete, navigating to Home');
            setHasProfile(true);
            requestUserPermission();
          } else {
            console.log('[App] Profile incomplete or missing, routing to SetProfile');
            setHasProfile(false);
          }
        } catch (error) {
          console.error('[App] Error checking profile:', error);
          // If profile check fails, assume no profile so they can attempt to create one
          setHasProfile(false);
        }
      } else {
        console.log('[App] No user logged in');
        setUser(null);
        setHasProfile(null);
        
        // Uninitialize ZegoCloud
        onUserLogout();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubNotifications = setupNotificationListeners();
    return () => unsubNotifications();
  }, []);

  useEffect(() => {
    if (user && hasProfile) {
      console.log('[App] Initializing Zego for:', user.uid);
      onUserLogin(user.uid, user.displayName || 'Talkenly User');
    }
  }, [user, hasProfile]);

  useEffect(() => {
    // Request location permission early so it's ready when user opens chat
    initLocationService();
  }, []);

  // Show spinner while Firebase checks existing login
  if (loading || (user && hasProfile === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});