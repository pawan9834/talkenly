import { storage } from "./firebase";
import * as ImagePicker from "expo-image-picker";
export const startMediaUploadTask = (
  chatId: string,
  asset: ImagePicker.ImagePickerAsset,
) => {
  const timestamp = Date.now();
  const filename =
    asset.uri.substring(asset.uri.lastIndexOf("/") + 1) || `${timestamp}`;
  const extension = asset.type === "video" ? "mp4" : "jpg";
  const fullFilename = filename.includes(".")
    ? filename
    : `${filename}.${extension}`;
  const path = `chats/${chatId}/media/${timestamp}_${fullFilename}`;
  const reference = storage().ref(path);
  const task = reference.putFile(asset.uri);
  return { task, reference, fullFilename, path };
};
export const uploadChatMedia = async (
  chatId: string,
  asset: ImagePicker.ImagePickerAsset,
  onProgress?: (progress: number) => void,
) => {
  try {
    const { task, reference, fullFilename } = startMediaUploadTask(
      chatId,
      asset,
    );
    const uploadPromise = new Promise<string>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error("[MediaService] Upload Task Error:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await reference.getDownloadURL();
          resolve(downloadURL);
        },
      );
    });
    const downloadURL = await uploadPromise;
    return {
      url: downloadURL,
      type: asset.type === "video" ? "video" : "image",
      width: asset.width,
      height: asset.height,
      duration: asset.duration || null,
      fileName: fullFilename,
      fileSize: asset.fileSize || 0,
    };
  } catch (error) {
    console.error("[MediaService] Upload Failed:", error);
    throw error;
  }
};
