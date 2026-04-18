import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Keyboard,
} from "react-native";
import auth from "@react-native-firebase/auth";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/index";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Login">;

const { width, height } = Dimensions.get("window");

const KEYBOARD_OFFSET = 5;

const COLORS = {
  primary: "#FF6B00",     // Vibrant Orange
  onyx: "#0F172A",        // Deep Navy
  slate: "#1E293B",
  background: "#0F172A",  // Deep Navy background
  text: "#FFFFFF",        // White text
  textSecondary: "#94A3B8", // Slate secondary text
  white: "#FFFFFF",
  border: "rgba(255,255,255,0.1)", // Glassmorphism border
  inputBg: "rgba(255,255,255,0.85)", // Lightened to make black text visible
  accent: "#FF6B00",
};

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Custom Keyboard Handling values (ChatInput Pattern)
  const [manualKeyboardHeight, setManualKeyboardHeight] = useState(0);
  const headerHeight = useRef(new Animated.Value(height * 0.55)).current;
  const brandingScale = useRef(new Animated.Value(1)).current;
  const keyboardSpacer = useRef(new Animated.Value(0)).current;

  // Form specific animations
  const inputBorderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Keyboard listeners for custom avoidance logic (Ported from ChatInput)
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      setManualKeyboardHeight(h + KEYBOARD_OFFSET);

      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: height * 0.28,
          duration: e.duration || 300,
          useNativeDriver: false,
        }),
        Animated.spring(brandingScale, {
          toValue: 0.75,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(keyboardSpacer, {
          toValue: h + KEYBOARD_OFFSET,
          duration: e.duration || 300,
          useNativeDriver: false,
        }),
      ]).start();
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, (e) => {
      setManualKeyboardHeight(0);

      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: height * 0.55,
          duration: e.duration || 300,
          useNativeDriver: false,
        }),
        Animated.spring(brandingScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(keyboardSpacer, {
          toValue: 0,
          duration: e.duration || 300,
          useNativeDriver: false,
        }),
      ]).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(inputBorderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setPhone(cleaned);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    try {
      const fullPhone = "+91" + phone;
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      navigation.navigate("Otp", { phoneNumber: fullPhone, confirmation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = phone.length !== 10 || loading;

  const inputWrapperStyle = {
    borderColor: inputBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.border, COLORS.primary],
    }),
    backgroundColor: inputBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.inputBg, COLORS.white],
    }),
    shadowOpacity: inputBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.1],
    }),
    elevation: inputBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.onyx} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Top Header Section (Orange) */}
        <Animated.View style={[styles.header, { height: headerHeight }]}>
          <LinearGradient
            colors={[COLORS.onyx, COLORS.primary]}
            style={StyleSheet.absoluteFill}
          />
          <AnimatedBubbles />

          <Animated.View style={[styles.titleWrapper, { opacity: fadeAnim, transform: [{ scale: brandingScale }] }]}>
            <Text style={styles.appName}>Talkenly</Text>
            <Text style={styles.appSubtitle}>Secure. Fast. Global.</Text>
          </Animated.View>
        </Animated.View>

        {/* Bottom Form Section (White) */}
        <View style={styles.body}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.heading}>
              Step into a <Text style={styles.highlight}>new era</Text> of messaging.
            </Text>
            <View style={styles.formContainer}>
              <Animated.View style={[styles.inputWrapper, inputWrapperStyle]}>
                <View style={styles.countryBadge}>
                  <Text style={styles.countryLabel}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  maxLength={10}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </Animated.View>

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={isButtonDisabled}
                activeOpacity={0.9}
              >
                <Animated.View
                  style={[
                    styles.button,
                    {
                      opacity: isButtonDisabled ? 0.7 : 1,
                      transform: [{ scale: buttonScale }]
                    }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Log in</Text>
                  )}
                </Animated.View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {manualKeyboardHeight === 0 && (
            <View style={styles.footer}>
              <Text style={styles.legalText}>
                By logging in, you agree to our{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => navigation.navigate("Legal", { type: "terms" })}
                >
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => navigation.navigate("Legal", { type: "privacy" })}
                >
                  Privacy Policy
                </Text>
              </Text>
              <View style={styles.footerLine} />
            </View>
          )}

          {/* Custom Animated Spacer to push content up manually */}
          <Animated.View style={{ height: keyboardSpacer }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1 },
  header: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  decorationContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  sparkle1: { position: "absolute", top: 60, right: 60 },
  sparkle2: { position: "absolute", top: 120, left: 40 },
  sparkle3: { position: "absolute", bottom: 100, right: 40 },
  titleWrapper: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -1.5,
  },
  appSubtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.white,
    lineHeight: 42,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  highlight: {
    color: COLORS.primary,
  },
  subheading: {
    fontSize: 16,
    color: COLORS.textSecondary, // Refined Slate gray
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: "500",
  },
  formContainer: {
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 11,
    borderWidth: 1.5,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    backgroundColor: COLORS.inputBg,
  },
  countryBadge: {
    height: "100%",
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  countryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  button: {
    height: 60,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: "500",
  },
  legalLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  footerLine: {
    width: 140,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
  },
});
