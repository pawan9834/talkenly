import * as FileSystem from 'expo-file-system';
import { storage } from './firebase';

const MEDIA_DIRECTORY = `${FileSystem.documentDirectory}media/`;

/**
 * Ensures the localized media directory exists.
 */
export const ensureDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIRECTORY, { intermediates: true });
  }
};

/**
 * Gets the local URI for a given filename if it exists.
 * @param fileName 
 * @returns local path if exists, null otherwise
 */
export const getLocalMediaUri = async (fileName: string): Promise<string | null> => {
  if (!fileName) return null;
  const localUri = `${MEDIA_DIRECTORY}${fileName}`;
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  return fileInfo.exists ? localUri : null;
};

/**
 * Downloads a media file from Firebase Storage to local app storage.
 * @param remoteUrl Firebase Storage URL
 * @param fileName Original filename
 * @param onProgress Callback for progress tracking
 * @returns Local URI
 */
export const downloadMedia = async (
  remoteUrl: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  await ensureDirectoryExists();
  const localUri = `${MEDIA_DIRECTORY}${fileName}`;

  // Check if already exists to avoid redundant downloads
  const existing = await FileSystem.getInfoAsync(localUri);
  if (existing.exists) {
    return localUri;
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    remoteUrl,
    localUri,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      if (onProgress) onProgress(progress);
    }
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error('Download failed');
    return result.uri;
  } catch (error) {
    console.error('[MediaDownload] Error:', error);
    throw error;
  }
};

/**
 * Deletes a local media file.
 * @param fileName 
 */
export const deleteLocalMedia = async (fileName: string) => {
  const localUri = `${MEDIA_DIRECTORY}${fileName}`;
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (e) {
    console.warn('[MediaDownload] Delete failed:', e);
  }
};
