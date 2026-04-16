import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { CircularProgress } from "./CircularProgress";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
interface MediaPreviewModalProps {
  asset: ImagePicker.ImagePickerAsset;
  onClose: () => void;
  onSend: (caption: string) => void;
}
export default function MediaPreviewModal({
  asset,
  onClose,
  onSend,
}: MediaPreviewModalProps) {
  const [caption, setCaption] = useState("");
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {}
      <View style={StyleSheet.absoluteFill}>
        {asset.type === "video" ? (
          <Video
            source={{ uri: asset.uri }}
            style={styles.previewMedia}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
          />
        ) : (
          <Image
            source={{ uri: asset.uri }}
            style={styles.previewMedia}
            resizeMode="contain"
          />
        )}
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        {}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="crop" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="insert-emoticon" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="title" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="edit" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
        {}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.bottomActions,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Add a caption..."
                placeholderTextColor="#8696A0"
                value={caption}
                onChangeText={setCaption}
                multiline
              />
            </View>
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => onSend(caption)}
            >
              <Ionicons name="send" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 100,
    alignItems: "center",
    zIndex: 100,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    padding: 10,
    marginLeft: 4,
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#1F2C33",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  input: {
    color: "#FFF",
    fontSize: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00A884",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  progressContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    position: "absolute",
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  uploadingText: {
    color: "#FFF",
    fontSize: 16,
    marginTop: 15,
    fontWeight: "600",
  },
});
