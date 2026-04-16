import * as Location from "expo-location";
let cachedLocation: {
  latitude: number;
  longitude: number;
  address: string;
} | null = null;
let permissionGranted = false;
export const initLocationService = async (): Promise<void> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    permissionGranted = status === "granted";
    if (!permissionGranted) return;
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      cachedLocation = await buildLocationData(
        lastKnown.coords.latitude,
        lastKnown.coords.longitude,
      );
    }
    refreshLocationInBackground();
  } catch (error) {}
};
export const getLocation = async (): Promise<{
  latitude: number;
  longitude: number;
  address: string;
} | null> => {
  if (!permissionGranted) return null;
  if (cachedLocation) {
    refreshLocationInBackground();
    return cachedLocation;
  }
  return await fetchFreshLocation();
};
export const hasLocationPermission = (): boolean => permissionGranted;
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
      accuracy: Location.Accuracy.Balanced,
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
  let address = "";
  try {
    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo) {
      address = [geo.name, geo.street, geo.city, geo.region]
        .filter(Boolean)
        .join(", ");
    }
  } catch (_) {}
  return { latitude, longitude, address };
};
import firestore from "@react-native-firebase/firestore";
let liveLocationSubscription: Location.LocationSubscription | null = null;
export const LIVE_DURATIONS = [
  { label: "1 hour", seconds: 3600 },
  { label: "8 hours", seconds: 28800 },
  { label: "1 day", seconds: 86400 },
];
export const startLiveLocation = async (
  liveLocationId: string,
  durationSeconds: number,
): Promise<void> => {
  stopLiveLocation();
  const expiresAt = Date.now() + durationSeconds * 1000;
  liveLocationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    async (loc) => {
      const now = Date.now();
      if (now > expiresAt) {
        stopLiveLocation();
        await firestore()
          .collection("liveLocations")
          .doc(liveLocationId)
          .update({ isActive: false });
        return;
      }
      await firestore().collection("liveLocations").doc(liveLocationId).set(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          updatedAt: firestore.FieldValue.serverTimestamp(),
          isActive: true,
          expiresAt,
        },
        { merge: true },
      );
    },
  );
};
export const stopLiveLocation = (): void => {
  liveLocationSubscription?.remove();
  liveLocationSubscription = null;
};
export const isLiveLocationActive = (): boolean =>
  liveLocationSubscription !== null;
