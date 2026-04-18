import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import { useAuthStore } from "../store/authStore";
import { normalizeIndianPhoneNumber } from "../lib/phoneUtils";
import { requestUserPermission } from "../lib/notificationService";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";
export default function SetProfileScreen() {
  const { user, setHasProfile } = useAuthStore();
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };
  const uploadImage = async (uri: string, uid: string): Promise<string> => {
    const reference = storage().ref(`profilePictures/${uid}.jpg`);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };
  const handleReadyToChat = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your name to continue.");
      return;
    }
    if (!photoUri) {
      Alert.alert(
        "Photo Required",
        "Please select a profile photo to continue.",
      );
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      if (!user?.phoneNumber) throw new Error("Phone number not found");
      const normalizedPhone = normalizeIndianPhoneNumber(user.phoneNumber);
      if (!normalizedPhone) throw new Error("Invalid phone number format");
      let uploadedPhotoUrl = "";
      try {
        uploadedPhotoUrl = await uploadImage(photoUri, user.uid);
      } catch (uploadError: any) {
        console.error("[SetProfile] Storage Upload Error:", uploadError);
        throw new Error(
          `Media Upload Failed: ${uploadError.message || "Check your internet or Storage rules"}`,
        );
      }
      try {
        await user.updateProfile({
          displayName: name.trim(),
          photoURL: uploadedPhotoUrl,
        });
      } catch (authError: any) {
        console.error("[SetProfile] Auth Profile Update Error:", authError);
      }
      const serverTimestamp = firestore.FieldValue.serverTimestamp();
      const userData = {
        uid: user.uid,
        phoneNumber: normalizedPhone,
        displayName: name.trim(),
        photoURL: uploadedPhotoUrl,
        about: "Hey there! I am using Talkenly.",
        createdAt: serverTimestamp,
        lastSeen: serverTimestamp,
        isOnline: true,
      };
      try {
        await firestore().collection("users").doc(user.uid).set(userData);
      } catch (fsError: any) {
        console.error("[SetProfile] Firestore Write Error:", fsError);
        throw new Error(
          `Profile Save Failed: ${fsError.message || "Check your database permissions"}`,
        );
      }
      requestUserPermission();
      setSuccess(true);
      setTimeout(() => {
        setHasProfile(true);
      }, 2000);
    } catch (error: any) {
      console.error("[SetProfile] Error creating profile:", error);
      Alert.alert(
        "Setup Failed",
        error.message || "Could not create profile. Try again.",
      );
      setLoading(false);
    }
  };
  if (success) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFill} />
        <AnimatedBubbles />
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Welcome, {name}!</Text>
        <Text style={styles.successText}>Your profile is all set.</Text>
        <ActivityIndicator
          color="#FF6B00"
          size="large"
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFill} />
      <AnimatedBubbles />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile info</Text>
        <Text style={styles.headerSubtitle}>
          Please provide your name and a profile photo
        </Text>
      </View>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={handlePickImage}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarCameraText}>📷</Text>
            <Text style={styles.addPhotoText}>ADD PHOTO</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your name here"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
          autoFocus={false}
          maxLength={25}
        />
      </View>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        style={[
          styles.readyBtn,
          (!name.trim() || !photoUri || loading) && styles.readyBtnDisabled,
        ]}
        onPress={handleReadyToChat}
        disabled={!name.trim() || !photoUri || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.readyBtnText}>Ready to Chat</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#FF6B00",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
  },
  avatarCameraText: {
    fontSize: 36,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF6B00",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#FF6B00",
    paddingBottom: 8,
    marginBottom: 20,
  },
  input: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  readyBtn: {
    backgroundColor: "#FF6B00",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    elevation: 8,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  readyBtnDisabled: {
    backgroundColor: "rgba(255, 107, 0, 0.4)",
    elevation: 0,
    shadowOpacity: 0,
  },
  readyBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
  },
});

