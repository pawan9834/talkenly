import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';

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

  // Show spinner while Firebase checks existing login
  if (loading || (user && hasProfile === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
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