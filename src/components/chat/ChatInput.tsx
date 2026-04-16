import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Animated,
  Platform,
  BackHandler,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Contacts from "expo-contacts";
import FastEmojiPicker from "./FastEmojiPicker";
import { FlatList, Modal } from "react-native";
import { updateTypingStatus } from "../../lib/chatService";
import { uploadChatMedia } from "../../lib/mediaService";
import {
  getLocation,
  hasLocationPermission,
  startLiveLocation,
  stopLiveLocation,
  LIVE_DURATIONS,
} from "../../lib/locationService";
import * as ImagePicker from "expo-image-picker";
import MediaPreviewModal from "./MediaPreviewModal";
interface ChatInputProps {
  onSend: (
    text: string,
    replyTo?: any,
    uploadAsset?: ImagePicker.ImagePickerAsset,
  ) => void;
  chatId: string;
  userPhone: string;
  replyTo?: any;
  onCancelReply?: () => void;
  colors: {
    inputBg: string;
    inputAreaBg: string;
    icon: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
}
const KEYBOARD_OFFSET = 51;
const ATTACHMENT_OPTIONS = [
  {
    label: "Document",
    icon: "file-document-outline",
    lib: "MC",
    color: "#7F57F1",
  },
  { label: "Gallery", icon: "image", lib: "Ion", color: "#E91E8C" },
  { label: "Location", icon: "location-sharp", lib: "Ion", color: "#4CAF50" },
  { label: "Contact", icon: "person", lib: "Ion", color: "#2196F3" },
];
const AttachIcon = ({ icon, lib }: { icon: string; lib: string }) => {
  const p = { name: icon as any, size: 26, color: "#FFFFFF" };
  if (lib === "MC") return <MaterialCommunityIcons {...p} />;
  if (lib === "MI") return <MaterialIcons {...p} />;
  return <Ionicons {...p} />;
};
const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  chatId,
  userPhone,
  replyTo,
  onCancelReply,
  colors,
}) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isAttachPickerVisible, setIsAttachPickerVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [lastKeyboardHeight, setLastKeyboardHeight] = useState(300);
  const [manualKeyboardHeight, setManualKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const isSwitchingRef = useRef(false);
  const attachAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [allContacts, setAllContacts] = useState<Contacts.Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationStep, setLocationStep] = useState<"pick" | "live-duration">(
    "pick",
  );
  const [mediaLoading, setMediaLoading] = useState(false);
  const [previewAsset, setPreviewAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const showAttachPicker = () => {
    Keyboard.dismiss();
    setIsEmojiPickerVisible(false);
    setIsAttachPickerVisible(true);
    Animated.spring(attachAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  };
  const hideAttachPicker = () => {
    Animated.timing(attachAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setIsAttachPickerVisible(false));
  };
  const toggleAttachPicker = () => {
    isAttachPickerVisible ? hideAttachPicker() : showAttachPicker();
  };
  const handleContactShare = async () => {
    hideAttachPicker();
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please allow contacts access in your device settings.",
      );
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const withPhone = data.filter(
      (c) => c.phoneNumbers && c.phoneNumbers.length > 0,
    );
    setAllContacts(withPhone);
    setContactSearch("");
    setContactPickerVisible(true);
  };
  const sendContact = (contact: Contacts.Contact) => {
    setContactPickerVisible(false);
    const name = contact.name || "Unknown";
    const phones = contact.phoneNumbers?.map((p) => p.number ?? "") ?? [];
    onSend(JSON.stringify({ __type: "contact", name, phones }));
  };
  const filteredContacts = allContacts.filter((c) =>
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()),
  );
  const handleLocationShare = () => {
    hideAttachPicker();
    if (!hasLocationPermission()) {
      Alert.alert(
        "Location not available",
        "Please allow location access in your device settings and restart the app.",
      );
      return;
    }
    setLocationStep("pick");
    setLocationModalVisible(true);
  };
  const sendCurrentLocation = async () => {
    setLocationModalVisible(false);
    setLocationLoading(true);
    try {
      const loc = await getLocation();
      if (!loc) {
        Alert.alert("Error", "Could not get your location.");
        return;
      }
      onSend(JSON.stringify({ __type: "location", ...loc }));
    } finally {
      setLocationLoading(false);
    }
  };
  const sendLiveLocation = async (durationSeconds: number, label: string) => {
    setLocationModalVisible(false);
    setLocationLoading(true);
    try {
      const loc = await getLocation();
      if (!loc) {
        Alert.alert("Error", "Could not get your location.");
        return;
      }
      const liveId = `live_${Date.now()}`;
      onSend(
        JSON.stringify({
          __type: "liveLocation",
          liveId,
          duration: label,
          durationSeconds,
          ...loc,
        }),
      );
      await startLiveLocation(liveId, durationSeconds);
    } finally {
      setLocationLoading(false);
    }
  };
  const handleGalleryPick = async () => {
    try {
      hideAttachPicker();
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Gallery permission is required to send photos and videos.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPreviewAsset(result.assets[0]);
      }
    } catch (err) {
      console.error("[GalleryPick] Error:", err);
    }
  };
  const handleMediaSend = async (caption: string) => {
    if (!previewAsset) return;
    onSend(caption || "", undefined, previewAsset);
    setPreviewAsset(null);
  };
  useEffect(() => {
    const onBackPress = () => {
      if (isAttachPickerVisible) {
        hideAttachPicker();
        return true;
      }
      if (isEmojiPickerVisible) {
        toggleEmojiPicker();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [isEmojiPickerVisible, isAttachPickerVisible]);
  useEffect(() => {
    if (!chatId || !userPhone) return;
    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(chatId, userPhone, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(chatId, userPhone, false);
      }
    }, 2000);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [message, chatId, userPhone]);
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      setLastKeyboardHeight(h);
      setManualKeyboardHeight(h + KEYBOARD_OFFSET);
      setIsKeyboardVisible(true);
      if (!isSwitchingRef.current) setIsEmojiPickerVisible(false);
      isSwitchingRef.current = false;
      if (isAttachPickerVisible) hideAttachPicker();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      if (!isSwitchingRef.current) setManualKeyboardHeight(0);
      isSwitchingRef.current = false;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isAttachPickerVisible]);
  const handleSend = () => {
    if (message.trim().length === 0) return;
    const wasEmojiOpen = isEmojiPickerVisible;
    onSend(message.trim(), replyTo);
    setMessage("");
    if (replyTo) onCancelReply?.();
    if (wasEmojiOpen) {
      setIsEmojiPickerVisible(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (isAttachPickerVisible) hideAttachPicker();
  };
  const toggleEmojiPicker = () => {
    if (isEmojiPickerVisible) {
      isSwitchingRef.current = true;
      inputRef.current?.focus();
    } else {
      isSwitchingRef.current = true;
      Keyboard.dismiss();
      setIsEmojiPickerVisible(true);
      setManualKeyboardHeight(lastKeyboardHeight + KEYBOARD_OFFSET);
    }
  };
  const isAnyKeyboardOpen = isKeyboardVisible || isEmojiPickerVisible;
  const translateY = attachAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });
  return (
    <View style={{ backgroundColor: colors.inputAreaBg }}>
      {}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.contactModalOverlay}>
          <View
            style={[
              styles.contactModal,
              { backgroundColor: colors.inputAreaBg, height: "auto" },
            ]}
          >
            {}
            <View
              style={[
                styles.contactModalHeader,
                { borderBottomColor: colors.icon + "33" },
              ]}
            >
              <TouchableOpacity
                onPress={() =>
                  locationStep === "live-duration"
                    ? setLocationStep("pick")
                    : setLocationModalVisible(false)
                }
              >
                <Ionicons
                  name={
                    locationStep === "live-duration" ? "arrow-back" : "close"
                  }
                  size={24}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.contactModalTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {locationStep === "pick"
                  ? "Share location"
                  : "Share live location for..."}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            {locationStep === "pick" ? (
              <View style={styles.locationPickerBody}>
                {}
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    { borderBottomColor: colors.icon + "22" },
                  ]}
                  onPress={sendCurrentLocation}
                >
                  <View
                    style={[
                      styles.locationOptionIcon,
                      { backgroundColor: "#4CAF50" },
                    ]}
                  >
                    <Ionicons name="location-sharp" size={22} color="#FFF" />
                  </View>
                  <View style={styles.locationOptionText}>
                    <Text
                      style={[
                        styles.locationOptionTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Send current location
                    </Text>
                    <Text
                      style={[styles.locationOptionSub, { color: colors.icon }]}
                    >
                      Accurate to 10 metres
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
                {}
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    { borderBottomColor: colors.icon + "22" },
                  ]}
                  onPress={() => setLocationStep("live-duration")}
                >
                  <View
                    style={[
                      styles.locationOptionIcon,
                      { backgroundColor: "#2196F3" },
                    ]}
                  >
                    <Ionicons name="navigate" size={22} color="#FFF" />
                  </View>
                  <View style={styles.locationOptionText}>
                    <Text
                      style={[
                        styles.locationOptionTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Share live location
                    </Text>
                    <Text
                      style={[styles.locationOptionSub, { color: colors.icon }]}
                    >
                      Share your real-time location
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.locationPickerBody}>
                <Text style={[styles.liveDurationHint, { color: colors.icon }]}>
                  Your recipient can see your location during this time. You can
                  stop sharing at any time.
                </Text>
                {LIVE_DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.label}
                    style={[
                      styles.locationOption,
                      { borderBottomColor: colors.icon + "22" },
                    ]}
                    onPress={() => sendLiveLocation(d.seconds, d.label)}
                  >
                    <View
                      style={[
                        styles.locationOptionIcon,
                        { backgroundColor: "#2196F3" },
                      ]}
                    >
                      <Ionicons name="time-outline" size={22} color="#FFF" />
                    </View>
                    <Text
                      style={[
                        styles.locationOptionTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
      {}
      <Modal
        visible={contactPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setContactPickerVisible(false)}
      >
        <View style={styles.contactModalOverlay}>
          <View
            style={[
              styles.contactModal,
              { backgroundColor: colors.inputAreaBg },
            ]}
          >
            {}
            <View
              style={[
                styles.contactModalHeader,
                { borderBottomColor: colors.icon + "33" },
              ]}
            >
              <Text
                style={[
                  styles.contactModalTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Send Contact
              </Text>
              <TouchableOpacity onPress={() => setContactPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {}
            <View
              style={[
                styles.contactSearchBar,
                { backgroundColor: colors.inputBg },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={[
                  styles.contactSearchInput,
                  { color: colors.textPrimary },
                ]}
                placeholder="Search contacts..."
                placeholderTextColor={colors.icon}
                value={contactSearch}
                onChangeText={setContactSearch}
                autoFocus
              />
              {contactSearch.length > 0 && (
                <TouchableOpacity onPress={() => setContactSearch("")}>
                  <Ionicons name="close-circle" size={18} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>
            {}
            <FlatList
              data={filteredContacts}
              keyExtractor={(item, i) => item.id ?? `${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.contactRow,
                    { borderBottomColor: colors.icon + "22" },
                  ]}
                  onPress={() => sendContact(item)}
                >
                  <View
                    style={[
                      styles.contactAvatar,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text style={styles.contactAvatarText}>
                      {(item.name?.[0] ?? "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text
                      style={[
                        styles.contactName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.contactPhone, { color: colors.icon }]}
                      numberOfLines={1}
                    >
                      {item.phoneNumbers?.[0]?.number ?? ""}
                    </Text>
                  </View>
                  <Ionicons name="send" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.contactEmpty}>
                  <Text style={{ color: colors.icon }}>No contacts found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
      {}
      {isAttachPickerVisible && (
        <Animated.View
          style={[
            styles.attachPicker,
            {
              backgroundColor: colors.inputBg,
              opacity: attachAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.attachGrid}>
            {ATTACHMENT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.attachItem}
                onPress={() => {
                  if (opt.label === "Contact") {
                    handleContactShare();
                  } else if (opt.label === "Location") {
                    handleLocationShare();
                  } else if (opt.label === "Gallery") {
                    handleGalleryPick();
                  } else {
                    hideAttachPicker();
                    Alert.alert(opt.label, `${opt.label} feature coming soon!`);
                  }
                }}
              >
                <View
                  style={[styles.attachCircle, { backgroundColor: opt.color }]}
                >
                  <AttachIcon icon={opt.icon} lib={opt.lib} />
                </View>
                <Text
                  style={[styles.attachLabel, { color: colors.textPrimary }]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
      {}
      {locationLoading && (
        <View
          style={[
            styles.locationLoadingBar,
            { backgroundColor: colors.accent + "22" },
          ]}
        >
          <Ionicons
            name="location-sharp"
            size={16}
            color={colors.accent}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.locationLoadingText, { color: colors.accent }]}>
            Fetching your location...
          </Text>
        </View>
      )}
      {}
      <View
        style={{
          paddingBottom: isAnyKeyboardOpen ? 0 : Math.max(insets.bottom, 15),
          paddingTop: 8,
        }}
      >
        {}
        {replyTo && (
          <View
            style={[styles.replyPreview, { backgroundColor: colors.inputBg }]}
          >
            <View
              style={[
                styles.replyInner,
                {
                  borderLeftColor: colors.accent,
                  backgroundColor: colors.icon + "11",
                },
              ]}
            >
              <View style={styles.replyContent}>
                <Text
                  style={[styles.replySender, { color: colors.accent }]}
                  numberOfLines={1}
                >
                  {replyTo.senderPhone === userPhone
                    ? "You"
                    : replyTo.senderPhone}
                </Text>
                <Text
                  style={[styles.replyText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {replyTo.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onCancelReply}
                style={styles.replyCloseBtn}
              >
                <Ionicons name="close-circle" size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.inputContainer}>
          <View
            style={[styles.inputWrapper, { backgroundColor: colors.inputBg }]}
          >
            {}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleEmojiPicker}
            >
              <MaterialCommunityIcons
                name={
                  isEmojiPickerVisible ? "keyboard-outline" : "emoticon-outline"
                }
                size={24}
                color={colors.icon}
              />
            </TouchableOpacity>
            {}
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Message"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={message}
              onChangeText={setMessage}
              onFocus={() => {
                setIsEmojiPickerVisible(false);
                if (isAttachPickerVisible) hideAttachPicker();
              }}
            />
            {}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleAttachPicker}
            >
              <MaterialCommunityIcons
                name="paperclip"
                size={24}
                color={isAttachPickerVisible ? colors.accent : colors.icon}
                style={{ transform: [{ rotate: "-45deg" }] }}
              />
            </TouchableOpacity>
            {}
            {message.length === 0 && (
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="camera" size={24} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>
          {}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.accent }]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={mediaLoading}
          >
            {mediaLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : message.trim().length > 0 ? (
              <MaterialCommunityIcons
                name="send"
                size={22}
                color="#FFFFFF"
                style={{ marginLeft: 3 }}
              />
            ) : (
              <MaterialCommunityIcons
                name="microphone"
                size={24}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {}
      {previewAsset && (
        <Modal visible={!!previewAsset} animationType="fade">
          <MediaPreviewModal
            asset={previewAsset}
            onClose={() => setPreviewAsset(null)}
            onSend={handleMediaSend}
            isUploading={mediaLoading}
            uploadProgress={uploadProgress}
          />
        </Modal>
      )}
      {}
      <View style={{ height: manualKeyboardHeight }}>
        {isEmojiPickerVisible && (
          <FastEmojiPicker
            onEmojiSelected={(emoji) => setMessage((prev) => prev + emoji)}
            height={lastKeyboardHeight}
          />
        )}
      </View>
    </View>
  );
};
export default ChatInput;
const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 12,
    minHeight: 48,
    maxHeight: 120,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingTop: 8,
    paddingBottom: 8,
    marginLeft: 8,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  attachPicker: {
    width: "100%",
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  attachGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  attachItem: {
    width: "22%",
    alignItems: "center",
    marginBottom: 20,
  },
  attachCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  attachLabel: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  locationLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationLoadingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  locationPickerBody: {
    paddingBottom: 24,
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  locationOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  locationOptionText: { flex: 1 },
  locationOptionTitle: { fontSize: 16, fontWeight: "500" },
  locationOptionSub: { fontSize: 13, marginTop: 2 },
  liveDurationHint: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 14,
    lineHeight: 18,
  },
  contactModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  contactModal: {
    height: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  contactModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  contactModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  contactSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 15,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  contactAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "500", marginBottom: 2 },
  contactPhone: { fontSize: 13 },
  contactEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  replyPreview: {
    marginHorizontal: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
    marginBottom: -8,
    paddingTop: 4,
  },
  replyInner: {
    flexDirection: "row",
    padding: 8,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
  },
  replyCloseBtn: {
    padding: 4,
    justifyContent: "center",
  },
});
