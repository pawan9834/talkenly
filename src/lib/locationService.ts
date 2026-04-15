import * as Location from 'expo-location';

// ── In-memory location cache ─────────────────────────────────────────────────
let cachedLocation: {
  latitude: number;
  longitude: number;
  address: string;
} | null = null;

let permissionGranted = false;

/**
 * Called once at app startup.
 * Requests permission and pre-warms the cache using the last known OS position.
 */
export const initLocationService = async (): Promise<void> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    permissionGranted = status === 'granted';

    if (!permissionGranted) return;

    // 1. Instant: use last known OS location (cached by the OS — no GPS wait)
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      cachedLocation = await buildLocationData(
        lastKnown.coords.latitude,
        lastKnown.coords.longitude,
      );
    }

    // 2. Background: get a fresh accurate fix and update the cache silently
    refreshLocationInBackground();
  } catch (error) {
    console.warn('[LocationService] Init failed:', error);
  }
};

/**
 * Returns the cached location instantly.
 * Falls back to a fresh GPS fix if cache is empty (rare: first ever cold boot).
 */
export const getLocation = async (): Promise<{
  latitude: number;
  longitude: number;
  address: string;
} | null> => {
  if (!permissionGranted) return null;

  if (cachedLocation) {
    // Return cache immediately, refresh in background for next use
    refreshLocationInBackground();
    return cachedLocation;
  }

  // No cache yet — wait for a fresh fix (only happens on first ever boot)
  return await fetchFreshLocation();
};

/** Returns true if the user has granted location permission. */
export const hasLocationPermission = (): boolean => permissionGranted;

// ── Internals ─────────────────────────────────────────────────────────────────

const refreshLocationInBackground = async (): Promise<void> => {
  try {
    const fresh = await fetchFreshLocation();
    if (fresh) cachedLocation = fresh;
  } catch (_) {}
};

const fetchFreshLocation = async (): Promise<{
  latitude: number;
  longitude: number;
  address: string;
} | null> => {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // faster than High, still accurate
    });
    return await buildLocationData(loc.coords.latitude, loc.coords.longitude);
  } catch (_) {
    return null;
  }
};

const buildLocationData = async (
  latitude: number,
  longitude: number,
): Promise<{ latitude: number; longitude: number; address: string }> => {
  let address = '';
  try {
    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo) {
      address = [geo.name, geo.street, geo.city, geo.region]
        .filter(Boolean)
        .join(', ');
    }
  } catch (_) {}
  return { latitude, longitude, address };
};

// ── Live Location ─────────────────────────────────────────────────────────────

import firestore from '@react-native-firebase/firestore';

let liveLocationSubscription: Location.LocationSubscription | null = null;

export const LIVE_DURATIONS = [
  { label: '1 hour',   seconds: 3600 },
  { label: '8 hours',  seconds: 28800 },
  { label: '1 day',    seconds: 86400 },
];

/**
 * Starts sending live GPS updates to Firestore.
 * @param liveLocationId - Firestore doc ID to write to (liveLocations/{id})
 * @param durationSeconds - How long to stream (in seconds)
 */
export const startLiveLocation = async (
  liveLocationId: string,
  durationSeconds: number,
): Promise<void> => {
  // Stop any previous session
  stopLiveLocation();

  const expiresAt = Date.now() + durationSeconds * 1000;

  liveLocationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,   // update every 5 seconds
      distanceInterval: 10, // or every 10 meters
    },
    async (loc) => {
      const now = Date.now();
      if (now > expiresAt) {
        // Expired — stop watching and mark as ended
        stopLiveLocation();
        await firestore()
          .collection('liveLocations')
          .doc(liveLocationId)
          .update({ isActive: false });
        return;
      }

      await firestore()
        .collection('liveLocations')
        .doc(liveLocationId)
        .set({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          updatedAt: firestore.FieldValue.serverTimestamp(),
          isActive: true,
          expiresAt,
        }, { merge: true });
    },
  );
};

/** Stops the live location watcher. */
export const stopLiveLocation = (): void => {
  liveLocationSubscription?.remove();
  liveLocationSubscription = null;
};

/** Returns true if a live location session is currently active. */
export const isLiveLocationActive = (): boolean => liveLocationSubscription !== null;
