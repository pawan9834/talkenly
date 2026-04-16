import * as FileSystem from "expo-file-system/legacy";
const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
};
export const getCachedImage = async (remoteUrl: string): Promise<string> => {
  if (!remoteUrl || !remoteUrl.startsWith("http")) return remoteUrl;
  try {
    const filename = `img_cache_${getHash(remoteUrl)}.jpg`;
    const localUri = `${FileSystem.cacheDirectory}${filename}`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      return localUri;
    }
    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);
    if (downloadResult.status === 200) {
      return localUri;
    }
    return remoteUrl;
  } catch (error) {
    console.error("[ImageCache] Error:", error);
    return remoteUrl;
  }
};
export const prefetchImages = async (urls: string[]) => {
  const tasks = urls.map((url) => getCachedImage(url));
  return Promise.all(tasks);
};
