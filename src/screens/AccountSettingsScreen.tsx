import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types";
import { auth } from "../lib/firebase";
import { deleteAccountAndAllData } from "../lib/deleteAccountService";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";
type NavProp = NativeStackNavigationProp<RootStackParamList, "AccountSettings">;
export default function AccountSettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(false);
  const colors = useMemo(
    () => ({
      background: "#0F172A",
      headerBg: "#0F172A",
      headerText: "#FFFFFF",
      cardBg: "#1E293B",
      textPrimary: "#FFFFFF",
      textSecondary: "#94A3B8",
      border: "rgba(255,255,255,0.05)",
      icon: "#94A3B8",
      danger: "#F44336",
    }),
    [],
  );
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete my account",
      "Are you sure you want to delete your account? This action is permanent and will delete your profile, message history, and status updates.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteAccountAndAllData();
            } catch (error: any) {
              console.error("[AccountSettings] Deletion failed:", error);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Sensitive Operation",
                  "To delete your account, you must have logged in recently. Please log out and log back in, then try again.",
                  [
                    { text: "OK" },
                    { text: "Log Out", onPress: () => auth().signOut() },
                  ],
                );
              } else {
                Alert.alert(
                  "Error",
                  error.message ||
                    "Failed to delete account. Please try again later.",
                );
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };
  const renderSettingItem = (
    iconName: string,
    iconType: "Feather" | "Ionicons" | "MaterialIcons",
    title: string,
    subtitle?: string,
    onPress?: () => void,
  ) => {
    const IconComponent: any =
      iconType === "Feather"
        ? Feather
        : iconType === "Ionicons"
          ? Ionicons
          : MaterialIcons;
    return (
      <TouchableOpacity
        style={[styles.settingItem, { borderBottomColor: colors.border }]}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <IconComponent name={iconName} size={24} color={colors.icon} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.settingSubtitle, { color: colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.headerContainer}>
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFill} />
        <AnimatedBubbles />
        <SafeAreaView edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account</Text>
          </View>
        </SafeAreaView>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: colors.cardBg,
              borderTopColor: colors.border,
              borderBottomColor: colors.border,
              borderTopWidth: 1,
              borderBottomWidth: 1,
            },
          ]}
        >
          {renderSettingItem(
            "notifications-outline",
            "Ionicons",
            "Security notifications",
          )}
          {renderSettingItem(
            "two-factor-authentication",
            "MaterialIcons",
            "Two-step verification",
          )}
          {renderSettingItem(
            "phonelink-setup",
            "MaterialIcons",
            "Change number",
          )}
        </View>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: colors.cardBg,
              borderTopColor: colors.border,
              borderBottomColor: colors.border,
              borderTopWidth: 1,
              borderBottomWidth: 1,
            },
          ]}
        >
          {renderSettingItem(
            "file-download-outline",
            "MaterialIcons",
            "Request account info",
          )}
        </View>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: colors.cardBg,
              borderTopColor: colors.border,
              borderBottomColor: colors.border,
              borderTopWidth: 1,
              borderBottomWidth: 1,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text
                style={[
                  styles.settingTitle,
                  { color: colors.danger, fontWeight: "500" },
                ]}
              >
                Delete my account
              </Text>
            </View>
            {loading && (
              <ActivityIndicator
                color={colors.danger}
                size="small"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Deleting your account will:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: colors.textSecondary }]}>
              •
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Delete your account info and profile photo
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: colors.textSecondary }]}>
              •
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Delete your entire message history
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: colors.textSecondary }]}>
              •
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Remove any status updates you have posted
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    paddingBottom: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { marginRight: 16 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  scrollContent: { paddingVertical: 16 },
  settingsGroup: { marginBottom: 16 },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  iconContainer: { width: 40, alignItems: "flex-start" },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: "400" },
  settingSubtitle: { fontSize: 13, marginTop: 2 },
  infoSection: { paddingHorizontal: 24, marginTop: 8 },
  infoText: { fontSize: 14, lineHeight: 20, flex: 1 },
  bulletPoint: { flexDirection: "row", marginTop: 12 },
  bullet: { fontSize: 14, marginRight: 8 },
});
