import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableHighlight,
  Image,
  Linking,
  Alert,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { CircularProgress } from "./CircularProgress";
const URL_REGEX = /(?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})\S*/gi;
import { formatFileSize } from "../../lib/formatUtils";
import {
  getLocalMediaUri,
  downloadMedia,
} from "../../lib/mediaDownloadService";
export interface ChatMessageUI {
  id: string;
  text: string;
  time: string;
  isMe: boolean;
  status: "sent" | "delivered" | "read" | "pending";
  type?:
    | "text"
    | "contact"
    | "location"
    | "liveLocation"
    | "deleted"
    | "image"
    | "video";
  contactData?: { name: string; phones: string[] };
  locationData?: { latitude: number; longitude: number; address: string };
  liveLocationData?: {
    liveId: string;
    duration: string;
    latitude: number;
    longitude: number;
    address: string;
  };
  replyTo?: {
    id: string;
    text: string;
    senderPhone: string;
    type?: string;
  };
  isStarred?: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  fileSize?: number;
  fileName?: string;
  localPath?: string;
  duration?: number | null;
}
interface MessageItemProps {
  item: ChatMessageUI;
  onLongPress?: (msg: ChatMessageUI) => void;
  onPress?: (msg: ChatMessageUI) => void;
  onReplyPress?: (msgId: string) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  colors: {
    bubbleSelf: string;
    bubbleOther: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
  uploadProgress?: number;
  onCancelUpload?: () => void;
}
const ReplyBox: React.FC<{
  replyTo: ChatMessageUI["replyTo"];
  colors: MessageItemProps["colors"];
  onPress?: () => void;
}> = ({ replyTo, colors, onPress }) => {
  if (!replyTo) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.replyBox,
        {
          backgroundColor: colors.textSecondary + "1A",
          borderLeftColor: colors.accent,
        },
      ]}
    >
      <Text
        style={[styles.replySender, { color: colors.accent }]}
        numberOfLines={1}
      >
        {replyTo.senderPhone}
      </Text>
      <Text
        style={[styles.replyText, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {replyTo.text}
      </Text>
    </TouchableOpacity>
  );
};
const LocationCard: React.FC<{
  item: ChatMessageUI;
  colors: MessageItemProps["colors"];
}> = ({ item, colors }) => {
  const { locationData } = item;
  if (!locationData) return null;
  const { latitude, longitude, address } = locationData;
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=280x130&markers=${latitude},${longitude},red-pushpin`;
  const openMaps = () => {
    Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
  };
  const bubbleBg = item.isMe ? colors.bubbleSelf : colors.bubbleOther;
  return (
    <View
      style={[
        styles.locationBubble,
        { backgroundColor: bubbleBg },
        item.isMe ? styles.myBubble : styles.otherBubble,
      ]}
    >
      {}
      <TouchableOpacity onPress={openMaps} activeOpacity={0.85}>
        <Image
          source={{ uri: mapUrl }}
          style={styles.mapThumb}
          resizeMode="cover"
        />
        {}
        <View style={styles.mapPinOverlay}>
          <Ionicons name="location-sharp" size={28} color="#E53935" />
        </View>
      </TouchableOpacity>
      {}
      <View style={styles.locationInfo}>
        <Text
          style={[styles.locationAddress, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        </Text>
      </View>
      <View
        style={[
          styles.contactCardDivider,
          { backgroundColor: colors.textSecondary + "33" },
        ]}
      />
      <TouchableOpacity style={styles.contactCardAction} onPress={openMaps}>
        <Text style={[styles.contactCardActionText, { color: colors.accent }]}>
          Open in Maps
        </Text>
      </TouchableOpacity>
      {}
      <View
        style={[
          styles.bubbleFooter,
          { paddingHorizontal: 10, paddingBottom: 6 },
        ]}
      >
        {item.isStarred && (
          <Ionicons
            name="star"
            size={13}
            color="#FFD700"
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
          {item.time}
        </Text>
        {item.isMe && (
          <MaterialCommunityIcons
            name={
              item.status === "pending"
                ? "clock-outline"
                : item.status === "sent"
                  ? "check"
                  : "check-all"
            }
            size={15}
            color={item.status === "read" ? "#34B7F1" : colors.textSecondary}
            style={{ marginLeft: 3 }}
          />
        )}
      </View>
    </View>
  );
};
const LiveLocationCard: React.FC<{
  item: ChatMessageUI;
  colors: MessageItemProps["colors"];
}> = ({ item, colors }) => {
  const { liveLocationData } = item;
  if (!liveLocationData) return null;
  const { latitude, longitude, address, duration } = liveLocationData;
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=280x130&markers=${latitude},${longitude},red-pushpin`;
  const openMaps = () =>
    Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
  const bubbleBg = item.isMe ? colors.bubbleSelf : colors.bubbleOther;
  return (
    <View
      style={[
        styles.locationBubble,
        { backgroundColor: bubbleBg },
        item.isMe ? styles.myBubble : styles.otherBubble,
      ]}
    >
      <TouchableOpacity onPress={openMaps} activeOpacity={0.85}>
        <Image
          source={{ uri: mapUrl }}
          style={styles.mapThumb}
          resizeMode="cover"
        />
        {}
        <View style={styles.mapPinOverlay}>
          <View style={styles.livePinWrapper}>
            <View style={[styles.livePulseOuter, { borderColor: "#2196F3" }]} />
            <View style={[styles.livePinDot, { backgroundColor: "#2196F3" }]} />
          </View>
        </View>
        {}
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>● LIVE</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.locationInfo}>
        <Text
          style={[styles.locationAddress, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        </Text>
        <Text style={{ color: "#2196F3", fontSize: 12, marginTop: 2 }}>
          Sharing for {duration}
        </Text>
      </View>
      <View
        style={[
          styles.contactCardDivider,
          { backgroundColor: colors.textSecondary + "33" },
        ]}
      />
      <TouchableOpacity style={styles.contactCardAction} onPress={openMaps}>
        <Text style={[styles.contactCardActionText, { color: colors.accent }]}>
          Open in Maps
        </Text>
      </TouchableOpacity>
      <View
        style={[
          styles.bubbleFooter,
          { paddingHorizontal: 10, paddingBottom: 6 },
        ]}
      >
        {item.isStarred && (
          <Ionicons
            name="star"
            size={13}
            color="#FFD700"
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
          {item.time}
        </Text>
        {item.isMe && (
          <MaterialCommunityIcons
            name={
              item.status === "pending"
                ? "clock-outline"
                : item.status === "sent"
                  ? "check"
                  : "check-all"
            }
            size={15}
            color={item.status === "read" ? "#34B7F1" : colors.textSecondary}
            style={{ marginLeft: 3 }}
          />
        )}
      </View>
    </View>
  );
};
const ContactCard: React.FC<{
  item: ChatMessageUI;
  colors: MessageItemProps["colors"];
}> = ({ item, colors }) => {
  const { contactData } = item;
  if (!contactData) return null;
  const bubbleBg = item.isMe ? colors.bubbleSelf : colors.bubbleOther;
  return (
    <View
      style={[
        styles.contactBubble,
        { backgroundColor: bubbleBg },
        item.isMe ? styles.myBubble : styles.otherBubble,
      ]}
    >
      {}
      <View style={styles.contactCardTop}>
        {}
        <View
          style={[styles.contactCardAvatar, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.contactCardInitial}>
            {contactData.name?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={styles.contactCardDetails}>
          <Text
            style={[styles.contactCardName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {contactData.name}
          </Text>
          {contactData.phones.slice(0, 2).map((phone, i) => (
            <Text
              key={i}
              style={[styles.contactCardPhone, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {phone}
            </Text>
          ))}
        </View>
      </View>
      {}
      <View
        style={[
          styles.contactCardDivider,
          { backgroundColor: colors.textSecondary + "33" },
        ]}
      />
      <TouchableOpacity style={styles.contactCardAction}>
        <Text style={[styles.contactCardActionText, { color: colors.accent }]}>
          View Contact
        </Text>
      </TouchableOpacity>
      {}
      <View style={styles.bubbleFooter}>
        {item.isStarred && (
          <Ionicons
            name="star"
            size={13}
            color="#FFD700"
            style={{ marginRight: 4 }}
          />
        )}
        <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
          {item.time}
        </Text>
        {item.isMe && (
          <MaterialCommunityIcons
            name={
              item.status === "pending"
                ? "clock-outline"
                : item.status === "sent"
                  ? "check"
                  : "check-all"
            }
            size={15}
            color={item.status === "read" ? "#34B7F1" : colors.textSecondary}
            style={{ marginLeft: 3 }}
          />
        )}
      </View>
    </View>
  );
};
const RenderMessageText: React.FC<{
  text: string;
  colors: MessageItemProps["colors"];
  isMe: boolean;
}> = ({ text, colors }) => {
  if (!text) return null;
  const handleUrlPress = (url: string) => {
    const fullUrl = url.toLowerCase().startsWith("http")
      ? url
      : `https://${url}`;
    Linking.openURL(fullUrl).catch(() =>
      Alert.alert("Error", "Could not open link"),
    );
  };
  const parts = text.split(URL_REGEX);
  const matches = text.match(URL_REGEX);
  if (!matches) {
    return (
      <Text style={[styles.messageText, { color: colors.textPrimary }]}>
        {text}
      </Text>
    );
  }
  const elements: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    elements.push(
      <Text key={`text-${i}`} style={{ color: colors.textPrimary }}>
        {part}
      </Text>,
    );
    if (matches[i]) {
      const url = matches[i];
      elements.push(
        <Text
          key={`link-${i}`}
          style={[styles.linkText, { color: "#34B7F1" }]}
          onPress={() => handleUrlPress(url)}
        >
          {url}
        </Text>,
      );
    }
  });
  return (
    <Text
      style={[styles.messageText, { paddingHorizontal: 12, paddingBottom: 4 }]}
    >
      {elements}
    </Text>
  );
};
const MessageItem: React.FC<MessageItemProps> = ({
  item,
  onLongPress,
  onPress,
  onReplyPress,
  isSelected,
  isSelectionMode,
  colors,
  uploadProgress,
  onCancelUpload,
}) => {
  const [localUri, setLocalUri] = React.useState<string | null>(
    item.localPath || null,
  );
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  React.useEffect(() => {
    const checkLocal = async () => {
      if (item.fileName) {
        const uri = await getLocalMediaUri(item.fileName);
        if (uri) setLocalUri(uri);
      }
    };
    if (!localUri && (item.type === "image" || item.type === "video")) {
      checkLocal();
    }
  }, [item.fileName, item.id]);
  const handleDownload = async () => {
    if (!item.mediaUrl || !item.fileName || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const uri = await downloadMedia(item.mediaUrl, item.fileName, (p) => {
        setDownloadProgress(p);
      });
      setLocalUri(uri);
      setIsDownloading(false);
    } catch (error) {
      console.error("[MessageItem] Download failed:", error);
      setIsDownloading(false);
      Alert.alert(
        "Download Failed",
        "Could not download media. Please try again.",
      );
    }
  };
  const renderDownloadOverlay = () => {
    if (localUri || item.isMe || isDownloading) return null;
    return (
      <View style={styles.downloadOverlay}>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={handleDownload}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-down" size={28} color="#FFF" />
          {item.fileSize ? (
            <Text style={styles.downloadSizeText}>
              {formatFileSize(item.fileSize)}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };
  const renderDownloadProgress = () => {
    const label = `${Math.round(downloadProgress * 100)}%`;
    return (
      <View style={styles.uploadOverlay}>
        <CircularProgress progress={downloadProgress} size={55} label={label} />
        {item.fileSize ? (
          <Text style={styles.downloadSizeTextBelow}>
            {formatFileSize(item.fileSize)}
          </Text>
        ) : null}
      </View>
    );
  };
  const renderMediaContent = () => {
    if (item.type !== "image" && item.type !== "video") return null;
    if (!item.mediaUrl && !localUri) return null;
    const sourceUri = localUri || item.mediaUrl;
    const isPlaceholder = !localUri && !item.isMe;
    return (
      <View style={styles.mediaContainer}>
        {item.type === "image" ? (
          <View style={{ flex: 1 }}>
            <Image
              source={{ uri: sourceUri }}
              style={[
                styles.messageImage,
                isPlaceholder && styles.blurredImage,
              ]}
              resizeMode="cover"
              blurRadius={isPlaceholder ? 20 : 0}
            />
            {renderDownloadOverlay()}
          </View>
        ) : (
          <View style={styles.videoPlaceholder}>
            {}
            {isPlaceholder ? (
              <Image
                source={{ uri: sourceUri }}
                style={[styles.messageImage, styles.blurredImage]}
                resizeMode="cover"
                blurRadius={20}
              />
            ) : (
              <Video
                source={{ uri: sourceUri }}
                style={styles.messageImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
              />
            )}
            {!isPlaceholder ? (
              <View style={styles.playOverlay}>
                <Ionicons
                  name="play-circle"
                  size={50}
                  color="rgba(255,255,255,0.8)"
                />
                {item.duration && (
                  <Text style={styles.durationText}>
                    {Math.floor(item.duration / 1000)}s
                  </Text>
                )}
              </View>
            ) : (
              renderDownloadOverlay()
            )}
          </View>
        )}
        {}
        {typeof uploadProgress === "number" && (
          <View style={styles.uploadOverlay}>
            <CircularProgress
              progress={uploadProgress}
              size={50}
              onCancel={onCancelUpload}
            />
          </View>
        )}
        {}
        {isDownloading && renderDownloadProgress()}
      </View>
    );
  };
  return (
    <TouchableHighlight
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={600}
      underlayColor="transparent"
      style={[
        styles.selectionWrapper,
        isSelected && { backgroundColor: colors.accent + "30" },
      ]}
    >
      <View
        style={[
          styles.messageRow,
          item.isMe ? styles.myMessageRow : styles.otherMessageRow,
        ]}
        pointerEvents={isSelectionMode ? "none" : "auto"}
      >
        {}
        {isSelected && (
          <View
            style={[
              styles.checkCircle,
              item.isMe ? { marginRight: 8 } : { marginLeft: 8 },
              { backgroundColor: colors.accent, alignSelf: "center" },
            ]}
          >
            <Ionicons name="checkmark" size={14} color="#FFF" />
          </View>
        )}
        {item.type === "contact" ? (
          <ContactCard item={item} colors={colors} />
        ) : item.type === "location" ? (
          <LocationCard item={item} colors={colors} />
        ) : item.type === "liveLocation" ? (
          <LiveLocationCard item={item} colors={colors} />
        ) : item.type === "deleted" ? (
          <View
            style={[
              styles.bubble,
              item.isMe
                ? [styles.myBubble, { backgroundColor: colors.bubbleSelf }]
                : [styles.otherBubble, { backgroundColor: colors.bubbleOther }],
              { flexDirection: "row", alignItems: "center" },
            ]}
          >
            <MaterialIcons
              name="block"
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.messageText,
                { color: colors.textSecondary, fontStyle: "italic" },
              ]}
            >
              {item.text}
            </Text>
            <View style={[styles.bubbleFooter, { marginLeft: 8 }]}>
              {item.isStarred && (
                <Ionicons
                  name="star"
                  size={13}
                  color="#FFD700"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[styles.messageTime, { color: colors.textSecondary }]}
              >
                {item.time}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.bubble,
              item.isMe
                ? [styles.myBubble, { backgroundColor: colors.bubbleSelf }]
                : [styles.otherBubble, { backgroundColor: colors.bubbleOther }],
              (item.type === "image" || item.type === "video") &&
                styles.mediaBubble,
            ]}
          >
            <ReplyBox
              replyTo={item.replyTo}
              colors={colors}
              onPress={() => item.replyTo && onReplyPress?.(item.replyTo.id)}
            />
            {}
            {renderMediaContent()}
            {item.text &&
              item.text !== "📷 Photo" &&
              item.text !== "📽️ Video" && (
                <RenderMessageText
                  text={item.text}
                  colors={colors}
                  isMe={item.isMe}
                />
              )}
            <View
              style={[
                styles.bubbleFooter,
                (item.type === "image" || item.type === "video") && {
                  paddingHorizontal: 8,
                  paddingBottom: 4,
                },
              ]}
            >
              {item.isStarred && (
                <Ionicons
                  name="star"
                  size={13}
                  color="#FFD700"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[styles.messageTime, { color: colors.textSecondary }]}
              >
                {item.time}
              </Text>
              {item.isMe && (
                <MaterialCommunityIcons
                  name={
                    item.status === "pending"
                      ? "clock-outline"
                      : item.status === "sent"
                        ? "check"
                        : "check-all"
                  }
                  size={16}
                  color={
                    item.status === "read" ? "#34B7F1" : colors.textSecondary
                  }
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableHighlight>
  );
};
export default React.memo(MessageItem);
const styles = StyleSheet.create({
  messageRow: {
    width: "100%",
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: "row",
  },
  myMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  mediaBubble: {
    padding: 3,
    borderWidth: 0.8,
    borderColor: "rgba(0,0,0,0.08)",
  },
  myBubble: { borderTopRightRadius: 0, paddingHorizontal: 6 },
  otherBubble: { borderTopLeftRadius: 0, paddingHorizontal: 6 },
  messageText: {
    fontSize: 18,
    paddingHorizontal: 11,
    paddingTop: 5,
    lineHeight: 22,
  },
  linkText: {
    textDecorationLine: "underline",
  },
  mediaContainer: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 4,
    width: 280,
    height: 300,
    padding: 5,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  messageImage: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  durationText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  downloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  downloadBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  downloadSizeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  downloadSizeTextBelow: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blurredImage: {
    opacity: 0.9,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
    alignSelf: "flex-end",
  },
  messageTime: { fontSize: 11, paddingRight: 5 },
  statusIcon: { marginLeft: 4 },
  selectionWrapper: {
    width: "100%",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  locationBubble: {
    width: 240,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  mapThumb: {
    width: 240,
    height: 130,
  },
  mapPinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  locationInfo: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    lineHeight: 18,
  },
  livePinWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  livePulseOuter: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    opacity: 0.4,
  },
  livePinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#2196F3",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  contactBubble: {
    width: 240,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  contactCardTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: 10,
  },
  contactCardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactCardInitial: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  contactCardDetails: { flex: 1 },
  contactCardName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  contactCardPhone: {
    fontSize: 12,
    marginBottom: 1,
  },
  contactCardDivider: { height: 1, marginHorizontal: 0 },
  contactCardAction: {
    paddingVertical: 10,
    alignItems: "center",
  },
  contactCardActionText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  replyBox: {
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    marginBottom: 4,
  },
  replySender: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
