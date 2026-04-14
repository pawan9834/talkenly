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

export default function App() {
  const { setUser, setLoading, setHasProfile, loading, hasProfile, user } = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check if this user already has a Firestore profile
        try {
          const doc = await firestore().collection('users').doc(firebaseUser.uid).get();
          setHasProfile(doc.exists);
          
          if (doc.exists) {
            // Already have a profile, safe to request and sync token
            requestUserPermission();
          }
        } catch {
          setHasProfile(false);
        }
      } else {
        setUser(null);
        setHasProfile(null);
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