import * as FileSystem from 'expo-file-system/legacy';

/**
 * Custom Image Cache Handler using expo-file-system
 */

// Simple hash function for string to create unique filename
const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

export const getCachedImage = async (remoteUrl: string): Promise<string> => {
  if (!remoteUrl || !remoteUrl.startsWith('http')) return remoteUrl;

  try {
    // 1. Create a unique filename for the URL
    // We filter out special characters to ensure a valid filename
    const filename = `img_cache_${getHash(remoteUrl)}.jpg`;
    const localUri = `${FileSystem.cacheDirectory}${filename}`;

    // 2. Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
      return localUri;
    }

    // 3. If not, download the file
    console.log('[ImageCache] Downloading:', remoteUrl);
    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);

    if (downloadResult.status === 200) {
      return localUri;
    }

    return remoteUrl; // Fallback to remote if download fails
  } catch (error) {
    console.error('[ImageCache] Error:', error);
    return remoteUrl;
  }
};

/**
 * Pre-downloads multiple images to the cache
 */
export const prefetchImages = async (urls: string[]) => {
  const tasks = urls.map(url => getCachedImage(url));
  return Promise.all(tasks);
};
