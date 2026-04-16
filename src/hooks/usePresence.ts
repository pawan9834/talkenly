import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { auth, firestore } from "../lib/firebase";
export const usePresence = (hasProfile: boolean | null = null) => {
  const currentUser = auth().currentUser;
  useEffect(() => {
    if (!currentUser || hasProfile !== true) return;
    const userRef = firestore().collection("users").doc(currentUser.uid);
    const updateStatus = async (isOnline: boolean) => {
      try {
        await userRef.set(
          {
            isOnline,
            lastSeen: Date.now(),
          },
          { merge: true },
        );
      } catch (error) {
        console.error("[Presence] Error updating status:", error);
      }
    };
    updateStatus(true);
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        updateStatus(true);
      } else {
        updateStatus(false);
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
      updateStatus(false);
    };
  }, [currentUser?.uid, hasProfile]);
};
