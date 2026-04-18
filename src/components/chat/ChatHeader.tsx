import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ZegoUIKitPrebuiltCallService } from "@zegocloud/zego-uikit-prebuilt-call-rn";
import { deleteChat, blockUser } from "../../lib/chatService";
import { saveCallLog } from "../../lib/callLogService";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBubbles from "../ui/AnimatedBubbles";
interface ChatHeaderProps {
  navigation: any;
  recipientName: string;
  recipientPhoto?: string | null;
  recipientUid?: string;
  recipientPhone?: string;
  isOnline: boolean;
  isTyping: boolean;
  chatId: string;
  onClearChat?: () => void;
  onBlock?: () => void;
  onMediaLinksDocs?: () => void;
  colors: {
    headerBg: string;
    cardBg: string;
    textPrimary: string;
    divider: string;
  };
  onDiagnostics?: () => void;
}
const ChatHeader: React.FC<ChatHeaderProps> = ({
  navigation,
  recipientName,
  recipientPhoto,
  recipientUid,
  recipientPhone,
  isOnline,
  isTyping,
  chatId,
  onClearChat,
  onBlock,
  onMediaLinksDocs,
  colors,
  onDiagnostics,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const handleOption = (label: string) => {
    setMenuVisible(false);
    if (label === "Clear chat") {
      Alert.alert(
        "Delete Chat?",
        "Are you sure you want to permanently delete this entire chat and all its messages? This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              if (chatId) {
                await deleteChat(chatId);
                onClearChat?.();
              }
            },
          },
        ],
      );
    } else if (label === "Block") {
      Alert.alert(
        "Block Contact?",
        `Are you sure you want to block ${recipientPhone}? They will no longer be able to send you messages.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              if (recipientPhone) {
                const success = await blockUser(recipientPhone);
                if (success) {
                  onBlock?.();
                } else {
                  Alert.alert(
                    "Error",
                    "Failed to block user. Please try again.",
                  );
                }
              }
            },
          },
        ],
      );
    } else if (label === "Media, links, and docs") {
      onMediaLinksDocs?.();
    } else {
      Alert.alert(label, `The ${label} feature is coming soon!`);
    }
  };
  const menuItems = [
    { label: "Search", icon: "search-outline", lib: Ionicons },
    {
      label: "Mute notifications",
      icon: "notifications-off-outline",
      lib: Ionicons,
    },
    { label: "Clear chat", icon: "mop", lib: MaterialCommunityIcons },
    { label: "Media, links, and docs", icon: "perm-media", lib: MaterialIcons },
    { label: "Block", icon: "ban", lib: Ionicons },
    { label: "Report", icon: "thumbs-down-outline", lib: Ionicons },
  ];
  return (
    <View style={styles.headerContainer}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFill} />
      <AnimatedBubbles />
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.userInfo}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate("Profile", {
                  userId: recipientUid,
                  name: recipientName,
                  photo: recipientPhoto,
                  phone: recipientPhone,
                })
              }
            >
              <View style={styles.avatarContainer}>
                {recipientPhoto ? (
                  <Image
                    source={{ uri: recipientPhoto }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <FontAwesome5 name="user-circle" size={36} color="#CCCCCC" />
                )}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {recipientName}
                </Text>
                {isTyping ? (
                  <Text style={styles.statusText}>typing...</Text>
                ) : isOnline ? (
                  <Text style={styles.statusText}>online</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            {recipientUid && (
              <>
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={async () => {
                    await ZegoUIKitPrebuiltCallService.sendCallInvitation({
                      callees: [{ userID: recipientUid, userName: recipientName }],
                      callType: 1,
                      resourceID: "zego_uikit_call",
                    });
                    saveCallLog({
                      name: recipientName,
                      phoneNumber: recipientUid,
                      type: "video",
                      status: "outgoing",
                      avatar: recipientPhoto || undefined,
                    });
                  }}
                >
                  <Ionicons name="videocam" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={async () => {
                    await ZegoUIKitPrebuiltCallService.sendCallInvitation({
                      callees: [{ userID: recipientUid, userName: recipientName }],
                      callType: 0,
                      resourceID: "zego_uikit_call",
                    });
                    saveCallLog({
                      name: recipientName,
                      phoneNumber: recipientUid,
                      type: "voice",
                      status: "outgoing",
                      avatar: recipientPhoto || undefined,
                    });
                  }}
                >
                  <Ionicons name="call" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setMenuVisible(true)}
            >
              <Feather name="more-vertical" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        { }
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.menuContainer,
                  {
                    backgroundColor:
                      colors.cardBg ??
                      (colors.headerBg === "#202C33" ? "#202C33" : "#FFFFFF"),
                  },
                ]}
              >
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={() => handleOption(item.label)}
                  >
                    <item.lib
                      name={item.icon as any}
                      size={20}
                      color={colors.textPrimary}
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={[styles.menuText, { color: colors.textPrimary }]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </View>
  );
};
export default ChatHeader;
const styles = StyleSheet.create({
  headerContainer: {
    height: 116,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backBtn: {
    padding: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 4,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 8,
  },
  headerAvatar: {
    width: "100%",
    height: "100%",
  },
  headerTextContainer: {
    flex: 1,
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  menuContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 50,
    right: 15,
    minWidth: 200,
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 15,
  },
});
