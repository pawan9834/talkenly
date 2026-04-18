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
  Dimensions,
  Animated,
  Keyboard,
  StatusBar,
  ScrollView,
} from "react-native";
import auth from "@react-native-firebase/auth";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types/index";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Otp">;
type RoutePropType = RouteProp<RootStackParamList, "Otp">;

const { width, height } = Dimensions.get("window");

const KEYBOARD_OFFSET = 51;
const RESEND_TIMEOUT = 30;

const COLORS = {
  primary: "#FF6B00",     // Vibrant Orange
  onyx: "#0F172A",        // Deep Navy
  slate: "#1E293B",
  background: "#0F172A",  // Deep Navy background
  text: "#FFFFFF",        // White text
  textSecondary: "#94A3B8", // Slate secondary text
  white: "#FFFFFF",
  border: "rgba(255,255,255,0.1)", // Glassmorphism border
  inputBg: "rgba(255,255,255,0.85)", // Lightened for black text
  accent: "#FF6B00",
};

export default function OtpScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { phoneNumber, confirmation } = route.params;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerHeight = useRef(new Animated.Value(height * 0.55)).current;
  const brandingScale = useRef(new Animated.Value(1)).current;
  const keyboardSpacer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance
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

    // Delayed focus for Android stability
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 600);

    // Resend Timer
    if (resendTimer > 0) {
      const resendTimerId = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => {
        clearTimeout(timer);
        clearTimeout(resendTimerId);
      };
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    // Keyboard listeners (ChatInput Pattern)
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
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

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) verifyOtp(cleaned);
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    try {
      await confirmation.confirm(code);
    } catch {
      Alert.alert("Invalid OTP", "The code is incorrect. Please try again.", [
        { text: "OK", onPress: () => setOtp("") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      await auth().signInWithPhoneNumber(phoneNumber);
      setResendTimer(RESEND_TIMEOUT);
      setCanResend(false);
      setOtp("");
      Alert.alert("OTP Sent", "A new OTP has been sent to " + phoneNumber);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const formattedPhone = phoneNumber.replace(/(\+91)(\d{5})(\d{5})/, "$1 $2 $3");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.onyx} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { height: headerHeight }]}>
          <LinearGradient
            colors={[COLORS.onyx, COLORS.slate]}
            style={StyleSheet.absoluteFill}
          />
          <AnimatedBubbles />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Animated.View style={[styles.titleWrapper, { opacity: fadeAnim, transform: [{ scale: brandingScale }] }]}>
            <Text style={styles.appName}>Verify OTP</Text>
            <Text style={styles.appSubtitle}>Code sent to {formattedPhone}</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.body}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.heading}>
              Almost <Text style={styles.highlight}>there</Text>.
            </Text>

            <TouchableOpacity
              style={styles.otpContainer}
              onPress={() => inputRef.current?.focus()}
              activeOpacity={0.7}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp.length === i && styles.otpBoxActive,
                    otp.length > i && styles.otpBoxFilled,
                  ]}
                >
                  <Text style={styles.otpDigit}>{otp[i] || ""}</Text>
                </View>
              ))}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
              />
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            )}

            {!loading && otp.length === 6 && (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => verifyOtp(otp)}
              >
                <Text style={styles.verifyBtnText}>Verify OTP</Text>
              </TouchableOpacity>
            )}

            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive the OTP? </Text>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
              )}
            </View>
          </Animated.View>

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
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
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
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: "500",
  },
  phoneHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  highlight: { color: COLORS.primary },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    marginTop: 10,
  },
  otpBox: {
    width: (width - 60 - 50) / 6,
    height: 64,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.inputBg,
  },
  otpDigit: { fontSize: 24, fontWeight: "800", color: "#000000" },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.05,
    fontSize: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  loadingText: { fontSize: 15, color: COLORS.primary, fontWeight: "600" },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  verifyBtnText: { color: COLORS.white, fontSize: 18, fontWeight: "800" },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  resendLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
  resendLink: { fontSize: 14, color: COLORS.primary, fontWeight: "800", textDecorationLine: "underline" },
  resendTimer: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
});
