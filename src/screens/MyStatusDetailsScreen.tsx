import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  useColorScheme,
  Share,
  Modal as RNModal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '../lib/firebase';
import { formatStatusTime } from '../lib/timeUtils';

export default function MyStatusDetailsScreen() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const navigation = useNavigation();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [viewersVisible, setViewersVisible] = useState(false);
  const [viewerProfiles, setViewerProfiles] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [statusViewsMapper, setStatusViewsMapper] = useState<Record<string, { uid: string, viewedAt: any }[]>>({});

  // Bottom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'delete' | 'success'>('success');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertStatusId, setAlertStatusId] = useState<string | null>(null);
  const alertAnim = React.useRef(new Animated.Value(300)).current;

  const showAlert = (type: 'delete' | 'success', message: string, statusId: string | null = null) => {
    setAlertType(type);
    setAlertMessage(message);
    setAlertStatusId(statusId);
    setAlertVisible(true);
    Animated.timing(alertAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.back(1)),
      useNativeDriver: true,
    }).start();

    // Auto-hide success message
    if (type === 'success') {
      setTimeout(() => {
        hideAlert();
      }, 2500);
    }
  };

  const hideAlert = () => {
    Animated.timing(alertAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setAlertVisible(false);
    });
  };

  const colors = {
    background: isDark ? '#0B141A' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#F2F2F2',
    primary: '#00A884',
    headerBg: isDark ? '#0B141A' : '#008080',
    delete: '#F15C6D',
    fabBg: '#00A884',
    fabSecondary: isDark ? '#202C33' : '#F2F2F2',
  };

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    const unsubscribe = firestore()
      .collection('statuses')
      .where('userId', '==', user.uid)
      .onSnapshot(snapshot => {
        if (!snapshot) return;

        const nowMillis = Date.now();
        const oneDayMillis = 24 * 60 * 60 * 1000;

        const docs = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((doc: any) => {
            if (!doc.createdAt) return true;
            return (nowMillis - doc.createdAt.toMillis()) < oneDayMillis;
          })
          .sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        setStatuses(docs);
        setLoading(false);
      }, err => {
        console.warn('[MyStatusDetails] Listener error:', err);
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  // Sync Views for My Statuses
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    return firestore()
      .collection('status_views')
      .where('ownerId', '==', user.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        console.log(`[MyStatusDetails] Received ${snap.size} view records from Firestore.`);
        const mapper: Record<string, {uid: string, viewedAt: any}[]> = {};
        snap.forEach(doc => {
          const data = doc.data() as any;
          if (!data.statusId || !data.viewerUid) return;
          
          if (!mapper[data.statusId]) mapper[data.statusId] = [];
          
          // Avoid duplicates in memory
          if (!mapper[data.statusId].find(v => v.uid === data.viewerUid)) {
            mapper[data.statusId].push({
              uid: data.viewerUid,
              viewedAt: data.viewedAt
            });
          }
        });
        setStatusViewsMapper(mapper);
      }, err => {
        console.error('[MyStatusDetails] Views Listener Error:', err);
      });
  }, []);

  const handleShare = async (item: any) => {
    try {
      setMenuVisible(false);
      await Share.share({
        url: item.mediaUri,
        message: `Check out my status on Talkenly! ${item.mediaUri}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSave = async (item: any) => {
    try {
      setMenuVisible(false);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow storage access to save media.');
        return;
      }

      const extension = item.mediaType === 'video' ? '.mp4' : '.jpg';
      const localUri = `${FileSystem.cacheDirectory}status_${Date.now()}${extension}`;

      const result = await FileSystem.downloadAsync(item.mediaUri, localUri);

      if (!result || result.status !== 200) {
        throw new Error('Download failed with status: ' + result?.status);
      }

      await MediaLibrary.saveToLibraryAsync(result.uri);
      showAlert('success', 'Media saved to gallery!');

      try { await FileSystem.deleteAsync(result.uri); } catch (e) { }
    } catch (error: any) {
      showAlert('success', 'Error: ' + error.message);
    }
  };

  const handleDelete = (statusId: string) => {
    setMenuVisible(false);
    showAlert('delete', 'Delete this status update?', statusId);
  };

  const confirmDelete = async () => {
    if (!alertStatusId) return;
    try {
      await firestore().collection('statuses').doc(alertStatusId).delete();
      hideAlert();
    } catch (e) {
      showAlert('success', 'Failed to delete status');
    }
  };

  const fetchViewerProfiles = async (views: { uid: string, viewedAt: any }[]) => {
    if (!views || views.length === 0) {
      setViewerProfiles([]);
      return;
    }
    const uids = views.map(v => v.uid);
    setLoadingViewers(true);
    setViewersVisible(true);
    try {
      // Firestore 'in' query limited to 30 items
      const chunks = [];
      for (let i = 0; i < uids.length; i += 30) {
        chunks.push(uids.slice(i, i + 30));
      }

      const allProfiles: any[] = [];
      for (const chunk of chunks) {
        const snapshot = await firestore()
          .collection('users')
          .where('__name__', 'in', chunk)
          .get();

        snapshot.docs.forEach(doc => {
          const profile = { id: doc.id, ...doc.data() as any };
          // Find the corresponding view time
          const viewData = views.find(v => v.uid === doc.id);
          allProfiles.push({
            ...profile,
            viewedAt: viewData?.viewedAt
          });
        });
      }

      // Sort by recency (most recent viewer at top)
      allProfiles.sort((a, b) => {
        const timeA = a.viewedAt?.toMillis ? a.viewedAt.toMillis() : 0;
        const timeB = b.viewedAt?.toMillis ? b.viewedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setViewerProfiles(allProfiles);
    } catch (e) {
      console.warn('[MyStatusDetails] Error fetching viewers:', e);
    } finally {
      setLoadingViewers(false);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isDark = theme === 'dark';
    const viewCount = statusViewsMapper[item.id]?.length || 0;

    return (
      <View style={[styles.itemContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.itemMain}
          activeOpacity={0.7}
          onPress={() => {
            // Emit event to open the viewer in the main screen
            DeviceEventEmitter.emit('PLAY_MY_STATUS', { index });
            navigation.goBack();
          }}
        >
          <Image source={{ uri: item.mediaUri }} style={styles.thumbnail} />
          <View style={styles.itemInfo}>
            {/* Split count area for better UX */}
            <TouchableOpacity
              style={styles.viewCountContainer}
            >
              <Text style={[styles.viewCount, { color: colors.textPrimary }]}>
                {viewCount} views
              </Text>
            </TouchableOpacity>

            <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
              {formatStatusTime(item.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              fetchViewerProfiles(statusViewsMapper[item.id] || []);
            }}
          >
            <MaterialIcons name="visibility" size={20} color={colors.textSecondary} style={{ marginRight: 6 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(event) => {
              setSelectedStatus(item);
              setMenuPosition({ x: event.nativeEvent.pageX - 150, y: event.nativeEvent.pageY });
              setMenuVisible(true);
            }}
          >
            <Feather name="more-vertical" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />

      <View style={[
        styles.header,
        {
          backgroundColor: colors.headerBg,
          paddingTop: insets.top,
          height: 60 + insets.top
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My status</Text>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <FlatList
              data={statuses}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
              ListFooterComponent={
                <View style={styles.encryptedFooter}>
                  <Ionicons name="lock-closed" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.encryptedText, { color: colors.textSecondary }]}>
                    Your status updates are{' '}
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>end-to-end encrypted</Text>
                    . They will disappear after 24 hours.
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={{ color: colors.textSecondary }}>No status updates</Text>
                </View>
              }
            />

            <View style={[styles.fabContainer, { bottom: 24 + insets.bottom }]}>
              <TouchableOpacity
                style={[styles.fabSecondary, { backgroundColor: colors.fabSecondary }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={22} color={isDark ? '#E9EDEF' : '#555'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fabPrimary, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Dropdown Menu Modal */}
      <RNModal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[
              styles.menuContainer,
              {
                backgroundColor: isDark ? '#233138' : '#FFFFFF',
                top: menuPosition.y,
                left: menuPosition.x,
              }
            ]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleShare(selectedStatus)}
              >
                <MaterialIcons name="share" size={20} color={colors.textPrimary} />
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleSave(selectedStatus)}
              >
                <MaterialIcons name="file-download" size={20} color={colors.textPrimary} />
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={() => handleDelete(selectedStatus.id)}
              >
                <MaterialIcons name="delete" size={20} color={colors.textPrimary} />
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Custom Bottom Alert Modal */}
      <RNModal
        visible={alertVisible}
        transparent={true}
        animationType="none"
        onRequestClose={hideAlert}
      >
        <TouchableWithoutFeedback onPress={hideAlert}>
          <View style={styles.alertOverlay}>
            <Animated.View
              style={[
                styles.alertContainer,
                {
                  backgroundColor: isDark ? '#233138' : '#FFFFFF',
                  transform: [{ translateY: alertAnim }]
                }
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={[styles.alertText, { color: colors.textPrimary }]}>{alertMessage}</Text>
                {alertType === 'delete' && (
                  <Text style={[styles.alertSubtext, { color: colors.textSecondary }]}>
                    This status update will be deleted for everyone.
                  </Text>
                )}
              </View>

              {alertType === 'delete' ? (
                <View style={styles.alertActions}>
                  <TouchableOpacity style={styles.alertBtnCancel} onPress={hideAlert}>
                    <Text style={[styles.alertBtnText, { color: colors.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.alertBtnConfirm, { backgroundColor: colors.delete }]} onPress={confirmDelete}>
                    <Text style={[styles.alertBtnText, { color: '#FFFFFF' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successContainer}>
                  <MaterialIcons name="check-circle" size={40} color={colors.primary} />
                </View>
              )}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Viewers List Modal */}
      <RNModal
        visible={viewersVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setViewersVisible(false)}
      >
        <TouchableOpacity
          style={styles.viewersOverlay}
          activeOpacity={1}
          onPress={() => setViewersVisible(false)}
        >
          <View style={[styles.viewersContainer, { backgroundColor: isDark ? '#202C33' : '#FFFFFF' }]}>
            <View style={[styles.viewersHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.viewersTitle, { color: colors.textPrimary }]}>Viewed by</Text>
            </View>

            {loadingViewers ? (
              <ActivityIndicator style={{ padding: 40 }} color={colors.primary} />
            ) : viewerProfiles.length === 0 ? (
              <View style={styles.noViewers}>
                <Text style={{ color: colors.textSecondary }}>No views yet</Text>
              </View>
            ) : (
              <FlatList
                data={viewerProfiles}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.viewerItem}>
                    <Image source={{ uri: item.photoURL || 'https://i.pravatar.cc/150?img=32' }} style={styles.viewerAvatar} />
                    <View style={styles.viewerInfo}>
                      <Text style={[styles.viewerName, { color: colors.textPrimary }]}>{item.displayName}</Text>
                      <Text style={[styles.viewerPhone, { color: colors.textSecondary }]}>
                        Watched {formatStatusTime(item.viewedAt)}
                      </Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  alertContainer: {
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 180,
  },
  alertHeader: {
    marginBottom: 24,
  },
  alertText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  alertSubtext: {
    fontSize: 14,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  alertBtnCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  alertBtnConfirm: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  alertBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  menuContainer: {
    position: 'absolute',
    width: 160,
    borderRadius: 8,
    paddingVertical: 4,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  list: {
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#333',
  },
  itemInfo: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  itemTime: {
    fontSize: 14,
    marginTop: 2,
  },
  viewCount: {
    fontSize: 16,
    fontWeight: '500',
  },
  viewCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 2,
  },
  deleteBtn: {
    padding: 10,
  },
  encryptedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
    paddingVertical: 20,
  },
  encryptedText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
  },
  fabPrimary: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 16,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2.22,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  viewersOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  viewersContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '40%',
  },
  viewersHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  viewersTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  noViewers: {
    padding: 40,
    alignItems: 'center',
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  viewerInfo: {
    marginLeft: 14,
  },
  viewerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewerPhone: {
    fontSize: 13,
    marginTop: 2,
  },
});