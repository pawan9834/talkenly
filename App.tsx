import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  requestUserPermission,
  setupNotificationListeners,
} from "./src/lib/notificationService";
import { initLocationService } from "./src/lib/locationService";
import AppNavigator from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/store/authStore";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  onUserLogin,
  onUserLogout,
  ZegoUIKitPrebuiltCallService,
} from "./src/lib/zegoService";
import { Platform } from "react-native";
import * as ZIM from "zego-zim-react-native";
import * as ZPNs from "zego-zpns-react-native";
ZegoUIKitPrebuiltCallService.useSystemCallingUI([ZIM, ZPNs]);
export default function App() {
  const { setUser, setLoading, setHasProfile, loading, hasProfile, user } =
    useAuthStore();
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const doc = await firestore()
            .collection("users")
            .doc(firebaseUser.uid)
            .get();
          const userData = doc.data();
          if (doc.exists() && userData?.displayName) {
            setHasProfile(true);
            requestUserPermission();
          } else {
            setHasProfile(false);
          }
        } catch (error) {
          console.error("[App] Error checking profile:", error);
          setHasProfile(false);
        }
      } else {
        setUser(null);
        setHasProfile(null);
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
      onUserLogin(user.uid, user.displayName || "Talkenly User");
    }
  }, [user, hasProfile]);
  useEffect(() => {
    initLocationService();
  }, []);
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
