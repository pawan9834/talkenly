import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types/index";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../components/ui/AnimatedBubbles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Legal">;
type LegalRouteProp = RouteProp<RootStackParamList, "Legal">;

const { width, height } = Dimensions.get("window");
const TAB_BAR_WIDTH = width - 40;
const TAB_PADDING = 4;
const INDICATOR_WIDTH = (TAB_BAR_WIDTH - TAB_PADDING * 2) / 2;

const COLORS = {
  primary: "#FF6B00",     // Vibrant Orange
  onyx: "#0F172A",        // Deep Navy
  slate: "#1E293B",
  background: "#0F172A",  // Deep Navy background
  text: "#FFFFFF",        // White text
  textSecondary: "#94A3B8", // Slate secondary text
  white: "#FFFFFF",
  border: "rgba(255,255,255,0.05)",
  accent: "#FF6B00",
};

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<LegalRouteProp>();
  const initialTab = route.params?.type || "terms";
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(initialTab);

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(initialTab === "terms" ? 0 : width)).current;

  useEffect(() => {
    if (initialTab === "privacy") {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: width, animated: false });
      }, 50);
    }
  }, []);

  const termsContent = [
    { title: "1. Account & Verification", body: "Talkenly uses your mobile phone number for secure authentication via Firebase SMS. You must provide an accurate number to access our global messaging services." },
    { title: "2. Communication Services", body: "Our platform provides real-time messaging, status updates, and peer-to-peer audio/video calls powered by ZegoCloud. Usage of these services is subject to fair use policies." },
    { title: "3. Media & Location Sharing", body: "You may share images, videos, and real-time locations with your contacts. You retain ownership of your content, but grant Talkenly the technical license required to deliver it to your recipients." },
    { title: "4. Calling Infrastructure", body: "Audio and video calls are handled through specialized signaling. By using Talkenly, you agree to grant necessary permissions for microphone and camera access for these features." },
    { title: "5. User Conduct", body: "You are solely responsible for your interactions. Harmful conduct, spamming, or unauthorized use of Talkenly's messaging infrastructure may result in account suspension." },
    { title: "6. Data Charges", body: "Talkenly uses your internet connection (Wi-Fi or Mobile Data) for all services. Please be aware that your mobile carrier may charge for data usage." },
    { title: "7. Account Deletion", body: "We provide a dedicated deletion service. You may request permanent erasure of your profile and data at any time through the app settings." },
  ];

  const privacyContent = [
    { title: "1. Core Data Collection", body: "We collect your phone number and display name to create your global identity. This data is securely managed through Google Firebase infrastructure." },
    { title: "2. Contact Synchronization", body: "To connect you with friends, we securely hash and sync your contact list. Your raw contact data is never stored on our permanent servers." },
    { title: "3. Message & Media Privacy", body: "Messages and media transferred via Talkenly are stored in encrypted environments. We prioritize your privacy and do not monitor your private conversations." },
    { title: "4. Location Privacy", body: "Talkenly only accesses your precise location when you explicitly choose to share it in a chat. This data is never collected or tracked in the background." },
    { title: "5. Call Privacy & Logs", body: "Call signaling and media streaming are handled with state-of-the-art encryption. We maintain minimal call logs for your history, which are stored locally or in your private cloud profile." },
    { title: "6. Third-Party Service Providers", body: "We use trusted partners like Firebase for data storage and ZegoCloud for high-quality calling. These partners do not have access to your private identity for marketing purposes." },
    { title: "7. Security Measures", body: "We employ industry-standard security protocols to protect your profile, media, and location data from unauthorized access." },
    { title: "8. Your Control", body: "You have full control over your profile and privacy settings. You can block users, hide your 'last seen' status, and manage notification preferences at any time." },
  ];

  const handleTabPress = (tab: "terms" | "privacy") => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ x: tab === "terms" ? 0 : width, animated: true });
  };

  const handleScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const tab = x >= width / 2 ? "privacy" : "terms";
    if (tab !== activeTab) setActiveTab(tab);
  };

  const tabIndicatorPos = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [TAB_PADDING, TAB_PADDING + INDICATOR_WIDTH],
    extrapolate: "clamp",
  });

  const termsColor = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [COLORS.white, "rgba(255,255,255,0.6)"],
    extrapolate: "clamp",
  });

  const privacyColor = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: ["rgba(255,255,255,0.6)", COLORS.white],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.onyx} />

      <View style={[styles.header, { paddingTop: insets.top, height: height * 0.18 + insets.top }]}>
        <LinearGradient
          colors={[COLORS.onyx, COLORS.slate]}
          style={StyleSheet.absoluteFill}
        />
        <AnimatedBubbles />

        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Legal Info</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <View style={styles.tabBackground}>
            <Animated.View style={[styles.tabIndicator, { left: tabIndicatorPos }]} />
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress("terms")}>
              <Animated.Text style={[styles.tabText, { color: termsColor }]}>Terms</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabPress("privacy")}>
              <Animated.Text style={[styles.tabText, { color: privacyColor }]}>Privacy</Animated.Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.contentWrapper}>
        <Animated.ScrollView
          ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          scrollEventThrottle={16} bounces={false}
        >
          <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Terms of Service</Text>
            <Text style={styles.lastUpdated}>Last Updated: April 17, 2026</Text>
            {termsContent.map((item, index) => (
              <View key={index} style={styles.card}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardBody}>{item.body}</Text></View>
            ))}
            <View style={{ height: insets.bottom + 40 }} />
          </ScrollView>

          <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Last Updated: April 17, 2026</Text>
            {privacyContent.map((item, index) => (
              <View key={index} style={styles.card}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardBody}>{item.body}</Text></View>
            ))}
            <View style={{ height: insets.bottom + 40 }} />
          </ScrollView>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.onyx,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 25,
    zIndex: 10,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  tabContainer: {
    marginTop: 10,
  },
  tabBackground: {
    height: 50,
    width: TAB_BAR_WIDTH,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 25,
    flexDirection: "row",
    padding: TAB_PADDING,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    height: 42,
    width: INDICATOR_WIDTH,
    backgroundColor: COLORS.primary,
    borderRadius: 21,
    top: 4,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "800",
  },
  contentWrapper: {
    flex: 1,
    marginTop: -25,
    backgroundColor: COLORS.background,
    zIndex: 5,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  lastUpdated: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    marginTop: 4,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontWeight: "500",
  },
});
