import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import auth from "@react-native-firebase/auth";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types/index";
type NavProp = NativeStackNavigationProp<RootStackParamList, "Otp">;
type RoutePropType = RouteProp<RootStackParamList, "Otp">;
const RESEND_TIMEOUT = 30;
export default function OtpScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { phoneNumber, confirmation } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not resend OTP.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };
  const formattedPhone = phoneNumber.replace(
    /(\+91)(\d{5})(\d{5})/,
    "$1 $2 $3",
  );
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit OTP sent to{"\n"}
          <Text style={styles.phoneHighlight}>{formattedPhone}</Text>
        </Text>
        {}
        <TouchableOpacity
          style={styles.otpContainer}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
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
            autoFocus
          />
        </TouchableOpacity>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#075E54" size="small" />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}
        {otp.length === 6 && !loading && (
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
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { fontSize: 15, color: "#075E54", fontWeight: "500" },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#777", lineHeight: 22, marginBottom: 40 },
  phoneHighlight: { color: "#075E54", fontWeight: "600" },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    position: "relative",
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  otpBoxActive: { borderColor: "#075E54", backgroundColor: "#f0faf9" },
  otpBoxFilled: { borderColor: "#075E54", backgroundColor: "#fff" },
  otpDigit: { fontSize: 22, fontWeight: "700", color: "#111" },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  loadingText: { fontSize: 14, color: "#075E54" },
  verifyBtn: {
    backgroundColor: "#075E54",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendLabel: { fontSize: 13, color: "#777" },
  resendLink: { fontSize: 13, color: "#075E54", fontWeight: "600" },
  resendTimer: { fontSize: 13, color: "#bbb" },
});
