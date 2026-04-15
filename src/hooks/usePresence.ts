import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { auth, firestore } from '../lib/firebase';

/**
 * Hook to manage user presence (online/offline status) in Firestore.
 * IMPORTANT: `hasProfile` must be true before this writes anything,
 * otherwise it would create a Firestore doc for brand-new users and
 * bypass the SetProfile screen.
 */
export const usePresence = (hasProfile: boolean | null = null) => {
  const currentUser = auth().currentUser;

  useEffect(() => {
    // Only track presence for users who have completed profile setup
    if (!currentUser || hasProfile !== true) return;

    const userRef = firestore().collection('users').doc(currentUser.uid);

    const updateStatus = async (isOnline: boolean) => {
      try {
        await userRef.set({
          isOnline,
          lastSeen: Date.now(),
        }, { merge: true });
        console.log(`[Presence] User ${currentUser.uid} is now ${isOnline ? 'online' : 'offline'}`);
      } catch (error) {
        console.error('[Presence] Error updating status:', error);
      }
    };

    // Set online immediately on mount or when profile is confirmed
    updateStatus(true);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateStatus(true);
      } else {
        updateStatus(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Attempt to set offline when logging out or closing
      updateStatus(false);
    };
  }, [currentUser?.uid, hasProfile]);
};
