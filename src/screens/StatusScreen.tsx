import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SectionList, Image, TouchableOpacity, useColorScheme, Modal, Animated, Easing, TouchableWithoutFeedback, StatusBar, Dimensions, Platform, FlatList, DeviceEventEmitter, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { auth, firestore } from '../lib/firebase';
import { fetchLocalContacts } from '../lib/database';
import { pickStatusMedia, uploadStatusMedia } from '../lib/statusUploader';
import { formatStatusTime } from '../lib/timeUtils';

// Helper component for segmented ring
const StatusRing = ({ stories, viewedStatusIds, size = 58, strokeWidth = 2.5, colors }: any) => {
  const count = stories?.length || 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (count <= 1) {
    const isViewed = count === 1 ? viewedStatusIds.has(stories[0].id) : false;
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isViewed ? colors.border : colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    );
  }

  const gap = 4; // gap in pixels
  const segmentLength = (circumference - gap * count) / count;
  // IMPORTANT: dashArray should only show ONE segment per circle and then a gap for the rest
  const dashArray = `${segmentLength} ${circumference - segmentLength}`;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {stories.map((story: any, i: number) => {
        const isViewed = viewedStatusIds.has(story.id);
        return (
          <Circle
            key={story.id || i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isViewed ? colors.border : colors.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={-i * (segmentLength + gap)}
            fill="none"
          />
        );
      })}
    </Svg>
  );
};

export default function StatusScreen() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const navigation = useNavigation();

  const currentUser = auth().currentUser;
  const [profilePhoto, setProfilePhoto] = useState(currentUser?.photoURL || 'https://i.pravatar.cc/150?img=33');
  const insets = useSafeAreaInsets();

  // Status Viewer State
  const [activeStatusIndex, setActiveStatusIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [viewerMenuVisible, setViewerMenuVisible] = useState(false);
  const [uploadOptionsVisible, setUploadOptionsVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [myStatusUploaded, setMyStatusUploaded] = useState(false);
  const [myStatuses, setMyStatuses] = useState<any[]>([]);
  const [contactsStatuses, setContactsStatuses] = useState<any[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaLibrary.Asset[]>([]);
  const [mediaCursor, setMediaCursor] = useState<string | undefined>();
  const [hasNextMediaPage, setHasNextMediaPage] = useState(true);

  // Real-time Viewed State (v2)
  const [myViewedStatusIds, setMyViewedStatusIds] = useState<Set<string>>(new Set());

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(200)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 200,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastVisible(false));
    }, 2500);
  };

  const progressAnim = useRef(new Animated.Value(0)).current;

  const isPaused = useRef(false);
  const progressValueRef = useRef(0);
  const touchStartTime = useRef(0);

  // Persistence Logic
  useEffect(() => {
    const loadStoredState = async () => {
      try {
        const [storedMyStatuses, storedMyStatusUploaded] = await Promise.all([
          AsyncStorage.getItem('talkenly_my_statuses'),
          AsyncStorage.getItem('talkenly_my_status_uploaded'),
        ]);

        if (storedMyStatuses) setMyStatuses(JSON.parse(storedMyStatuses));
        if (storedMyStatusUploaded) setMyStatusUploaded(JSON.parse(storedMyStatusUploaded));

        // Load cached profile photo for fallback
        if (currentUser) {
          const cacheKey = `profile_cache_${currentUser.uid}`;
          const cachedProfile = await AsyncStorage.getItem(cacheKey);
          if (cachedProfile) {
            const data = JSON.parse(cachedProfile);
            if (data.photoURL) setProfilePhoto(data.photoURL);
          }
        }
      } catch (e) {
        console.warn('[StatusScreen] Failed to load stored state:', e);
      }
    };
    loadStoredState();
  }, []);

  useEffect(() => {
    const saveState = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem('talkenly_my_statuses', JSON.stringify(myStatuses)),
          AsyncStorage.setItem('talkenly_my_status_uploaded', JSON.stringify(myStatusUploaded)),
        ]);
      } catch (e) {
        console.warn('[StatusScreen] Failed to save state:', e);
      }
    };
    saveState();
  }, [myStatuses, myStatusUploaded]);

  // Real-time Profile & Status Sync Logic
  const chunkStatusesRef = useRef<Record<number, any[]>>({});

  useEffect(() => {
    if (!currentUser) return;

    // Listen to current user's profile changes
    const unsubProfile = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data?.photoURL) {
            setProfilePhoto(data.photoURL);
          }
        }
      });

    let unsubscribes: (() => void)[] = [unsubProfile];

    const setupStatusSync = async () => {
      // 1. Load registered contacts
      const contacts = await fetchLocalContacts();
      const registeredPhones = contacts
        .filter(c => c.isRegistered === 1)
        .map(c => c.normalizedPhone);

      // 2. Query Firestore for statuses (Limit 30 per query)
      const phonesToSearch = [...registeredPhones];

      // Also add current user's phone to the search if not already there
      const myPhone = currentUser?.phoneNumber;
      if (myPhone && !phonesToSearch.includes(myPhone)) {
        phonesToSearch.push(myPhone);
      }

      if (phonesToSearch.length === 0) {
        setContactsStatuses([]);
        return;
      }

      const chunks = [];
      for (let i = 0; i < phonesToSearch.length; i += 30) {
        chunks.push(phonesToSearch.slice(i, i + 30));
      }

      const oneDayMillis = 24 * 60 * 60 * 1000;

      chunks.forEach((chunk, index) => {
        const unsub = firestore()
          .collection('statuses')
          .where('phoneNumber', 'in', chunk)
          .onSnapshot(snapshot => {
            if (!snapshot) return;

            const nowMillis = Date.now();

            // Map docs to objects and filter 24h in memory
            const docs = snapshot.docs
              .map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                };
              })
              .filter((doc: any) => {
                if (!doc.createdAt) return true; // Just uploaded
                return (nowMillis - doc.createdAt.toMillis()) < oneDayMillis;
              });

            // Group by User
            const grouped = docs.reduce((acc: any, status: any) => {
              const uid = status.userId;
              if (!acc[uid]) {
                acc[uid] = {
                  id: uid,
                  name: status.userName,
                  avatar: status.userAvatar,
                  stories: [],
                };
              }
              acc[uid].stories.push(status);
              return acc;
            }, {});

            // Sort stories by date within each user
            const users = Object.values(grouped).map((u: any) => {
              u.stories.sort((a: any, b: any) => {
                const aTime = a.createdAt?.toMillis() || Date.now();
                const bTime = b.createdAt?.toMillis() || Date.now();
                return aTime - bTime;
              });
              return u;
            });

            // Separate My Status and Contacts statuses
            const myId = currentUser?.uid;
            const updatedMyStatuses = users.find((u: any) => u.id === myId)?.stories || [];
            if (updatedMyStatuses.length > 0) {
              setMyStatuses(updatedMyStatuses);
              setMyStatusUploaded(true);
            } else {
              setMyStatuses([]);
              setMyStatusUploaded(false);
            }

            const otherUsers = users.filter((u: any) => u.id !== myId);

            // Aggregate results from all chunks
            chunkStatusesRef.current[index] = otherUsers;
            const allUsers = Object.values(chunkStatusesRef.current).flat();
            setContactsStatuses(allUsers);
          }, err => {
            console.warn('Status Listener Error:', err);
          });

        unsubscribes.push(unsub);
      });
    };

    setupStatusSync();

    // Cleanup own expired statuses from Firestore
    const cleanUpOldStatuses = async () => {
      if (!currentUser) return;
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const expired = await firestore()
          .collection('statuses')
          .where('userId', '==', currentUser.uid)
          .where('createdAt', '<', oneDayAgo)
          .get();

        const batch = firestore().batch();
        expired.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        if (expired.size > 0) console.log(`[StatusCleanup] Deleted ${expired.size} old status documents.`);
      } catch (e) {
        console.warn('[StatusCleanup] Failed:', e);
      }
    };

    cleanUpOldStatuses();

    // Refresh when contacts finish syncing in the background
    const syncListener = DeviceEventEmitter.addListener('contacts_synced', () => {
      console.log('[StatusScreen] Contacts synced, refreshing status listeners...');
      setupStatusSync();
    });

    const playListener = DeviceEventEmitter.addListener('PLAY_MY_STATUS', (data) => {
      setActiveStatusIndex(-1);
      setActiveStoryIndex(data.index || 0);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      syncListener.remove();
      playListener.remove();
    };
  }, []);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      progressValueRef.current = value;
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const startAnimation = (fromValue = 0) => {
    progressAnim.setValue(fromValue);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 15000 * (1 - fromValue),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused.current) {
        handleNextStatus();
      }
    });
  };

  useEffect(() => {
    if (activeStatusIndex !== null) {
      const activeUser = activeStatusIndex === -1 ? { stories: myStatuses } : contactsStatuses[activeStatusIndex];
      const story = activeUser?.stories?.[activeStoryIndex];

      if (story && activeStatusIndex !== -1) {
        // View tracking is now handled by the markAsViewed useEffect
      }

      isPaused.current = false;
      progressValueRef.current = 0;
      startAnimation(0);
    } else {
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatusIndex, activeStoryIndex]);

  useEffect(() => {
    if (uploadOptionsVisible) {
      // Reset and load first page on open
      setRecentMedia([]);
      setMediaCursor(undefined);
      setHasNextMediaPage(true);
      loadMediaPage(undefined);
    }
  }, [uploadOptionsVisible]);

  const loadMediaPage = async (cursor?: string) => {
    // If not first page and no more pages, skip
    if (cursor !== undefined && !hasNextMediaPage) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const media = await MediaLibrary.getAssetsAsync({
        first: 50,
        mediaType: ['photo', 'video'],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        after: cursor,
      });
      setRecentMedia(prev => cursor ? [...prev, ...media.assets] : media.assets);
      setMediaCursor(media.endCursor);
      setHasNextMediaPage(media.hasNextPage);
    }
  };

  const handleNextStatus = () => {
    setViewerMenuVisible(false);
    const activeUser = activeStatusIndex === -1 ? { stories: myStatuses } : contactsStatuses[activeStatusIndex!];

    if (activeStoryIndex < activeUser.stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      // Move to next user
      if (activeStatusIndex === -1) {
        setActiveStatusIndex(null);
        setActiveStoryIndex(0);
      } else if (activeStatusIndex! < contactsStatuses.length - 1) {
        setActiveStatusIndex(activeStatusIndex! + 1);
        setActiveStoryIndex(0);
      } else {
        setActiveStatusIndex(null);
        setActiveStoryIndex(0);
      }
    }
  };

  const handlePrevStatus = () => {
    setViewerMenuVisible(false);
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      // Move to prev user
      if (activeStatusIndex! > 0) {
        const prevUser = contactsStatuses[activeStatusIndex! - 1];
        setActiveStatusIndex(activeStatusIndex! - 1);
        setActiveStoryIndex(prevUser.stories.length - 1);
      } else {
        // Can't go back further
        if (activeStatusIndex === -1) {
          setActiveStatusIndex(null);
        } else {
          setActiveStatusIndex(null);
        }
        setActiveStoryIndex(0);
      }
    }
  };

  const handlePressIn = () => {
    touchStartTime.current = Date.now();
    isPaused.current = true;
    progressAnim.stopAnimation();
  };

  const handlePressOutLeft = () => {
    isPaused.current = false;
    const duration = Date.now() - touchStartTime.current;
    if (duration < 250) {
      handlePrevStatus();
    } else {
      // It was a hold, resume the animation
      if (activeStatusIndex !== null) startAnimation(progressValueRef.current);
    }
  };

  const handlePressOutRight = () => {
    isPaused.current = false;
    const duration = Date.now() - touchStartTime.current;
    if (duration < 250) {
      handleNextStatus();
    } else {
      // It was a hold, resume the animation
      if (activeStatusIndex !== null) startAnimation(progressValueRef.current);
    }
  };

  const handleAddStatus = async (useCamera: boolean) => {
    setUploadOptionsVisible(false);
    const asset = await pickStatusMedia(useCamera);
    if (asset) {
       // Navigate to Editor instead of uploading immediately
       (navigation as any).navigate('StatusMediaEditor', { asset });
    }
  };

  const handleMediaPick = async (asset: MediaLibrary.Asset) => {
    setUploadOptionsVisible(false);
    
    // Convert MediaLibrary asset to a compatible format for the Editor/Uploader
    const pickedAsset: any = {
      uri: asset.uri,
      type: asset.mediaType === 'video' ? 'video' : 'image',
      id: asset.id,
      duration: asset.duration
    };
    
    (navigation as any).navigate('StatusMediaEditor', { asset: pickedAsset });
  };

  const markAsViewed = async (story: any) => {
    if (!currentUser || !story.id) return;
    try {
      const viewId = `${story.id}_${currentUser.uid}`;
      console.log(`[StatusView] Attempting to mark ${story.id} as viewed by ${currentUser.uid}. Owner: ${story.userId}`);
      await firestore().collection('status_views').doc(viewId).set({
        statusId: story.id,
        viewerUid: currentUser.uid,
        ownerId: story.userId,
        viewedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('[StatusScreen] Error marking as viewed (v2):', e);
    }
  };

  useEffect(() => {
    if (activeStatusIndex !== null) {
      const activeUser = activeStatusIndex === -1 ? { stories: myStatuses } : contactsStatuses[activeStatusIndex];
      const story = activeUser?.stories?.[activeStoryIndex];

      if (story && story.id) {
        markAsViewed(story);
      }
    }
  }, [activeStatusIndex, activeStoryIndex, myStatuses, contactsStatuses]);

  // Sync My Viewed Statuses
  useEffect(() => {
    if (!currentUser) return;

    return firestore()
      .collection('status_views')
      .where('viewerUid', '==', currentUser.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        const ids = new Set(snap.docs.map(doc => (doc.data() as any).statusId));
        setMyViewedStatusIds(ids);
      });
  }, [currentUser?.uid]);

  const colors = {
    background: isDark ? '#111B21' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#F2F2F2',
    primary: isDark ? '#00A884' : '#008080',
    iconBg: '#00A884',
  };

  const renderStatusItem = ({ item }: { item: any }) => {
    const viewedCount = item.stories.filter((s: any) => myViewedStatusIds.has(s.id)).length;
    const isFullyViewed = viewedCount === item.stories.length;
    // Use the latest story as the thumbnail
    const thumbnailUri = item.stories[item.stories.length - 1].mediaUri;

    return (
      <TouchableOpacity
        style={styles.statusItem}
        activeOpacity={0.7}
        onPress={() => {
          const globalIndex = contactsStatuses.findIndex(u => u.id === item.id);
          if (globalIndex !== -1) {
            // Find first unviewed story based on local viewed state
            const firstUnviewed = item.stories.findIndex((s: any) => !myViewedStatusIds.has(s.id));
            setActiveStatusIndex(globalIndex);
            setActiveStoryIndex(firstUnviewed === -1 ? 0 : firstUnviewed);
          }
        }}
      >
        <View style={styles.avatarContainer}>
          <View style={StyleSheet.absoluteFill}>
            <StatusRing
              stories={item.stories}
              viewedStatusIds={myViewedStatusIds}
              colors={colors}
            />
          </View>
          <Image source={{ uri: thumbnailUri }} style={styles.avatar} />
        </View>
        <View style={styles.statusInfo}>
          <Text style={[styles.statusName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.statusTime, { color: colors.textSecondary }]}>
            {formatStatusTime(item.stories[item.stories.length - 1].createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const recentUpdates = contactsStatuses.filter(item => item.stories.some((s: any) => !myViewedStatusIds.has(s.id)));
  const viewedUpdates = contactsStatuses.filter(item => item.stories.every((s: any) => myViewedStatusIds.has(s.id)));

  const sections = [
    ...(recentUpdates.length > 0 ? [{ title: 'Recent updates', data: recentUpdates }] : []),
    ...(viewedUpdates.length > 0 ? [{ title: 'Viewed updates', data: viewedUpdates }] : [])
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* My Status */}
      <View style={styles.statusItem}>
        {/* Play Status (Avatar) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (myStatusUploaded && myStatuses.length > 0) {
              setActiveStatusIndex(-1);
            } else {
              setUploadOptionsVisible(true);
            }
          }}
        >
          <View style={myStatusUploaded ? styles.avatarContainer : styles.myAvatarContainer}>
            {myStatusUploaded && (
              <View style={StyleSheet.absoluteFill}>
                <StatusRing 
                  stories={myStatuses} 
                  viewedStatusIds={myViewedStatusIds} 
                  colors={colors}
                />
              </View>
            )}
            <Image
              source={{ uri: (myStatusUploaded && myStatuses.length > 0) ? myStatuses[myStatuses.length - 1].mediaUri : profilePhoto }}
              style={styles.avatar}
            />
            {!myStatusUploaded && (
              <View style={[styles.addIconContainer, { backgroundColor: colors.iconBg, borderColor: colors.background }]}>
                {isUploading ? (
                  <MaterialIcons name="hourglass-empty" size={14} color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="add" size={16} color="#FFFFFF" />
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Manage/Details (Row Info) */}
        <TouchableOpacity
          style={styles.itemInfoTouchable}
          activeOpacity={0.7}
          onPress={() => {
            if (myStatusUploaded && myStatuses.length > 0) {
              (navigation as any).navigate('MyStatusDetails');
            } else {
              setUploadOptionsVisible(true);
            }
          }}
        >
          <View style={[styles.statusInfo, { borderBottomWidth: 0 }]}>
            <Text style={[styles.statusName, { color: colors.textPrimary }]}>My status</Text>
            <Text style={[styles.statusTime, { color: colors.textSecondary }]}>
              {myStatusUploaded && myStatuses.length > 0 ? formatStatusTime(myStatuses[myStatuses.length - 1].createdAt) : 'Tap to add status update'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Status List via SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderStatusItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={activeStatusIndex !== null}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setActiveStatusIndex(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {activeStatusIndex !== null && (() => {
            const activeUser = activeStatusIndex === -1 ? { name: 'My status', avatar: profilePhoto, stories: myStatuses } : contactsStatuses[activeStatusIndex];
            if (!activeUser || !activeUser.stories?.[activeStoryIndex]) return null;
            const story = activeUser.stories[activeStoryIndex];

            return (
              <View style={[styles.viewerContainer, {
                paddingTop: Math.max(
                  (Platform.OS === 'android'
                    ? (StatusBar.currentHeight || insets.top)
                    : insets.top) - 11,
                  0
                ),
                paddingBottom: insets.bottom,

                paddingLeft: Math.max(insets.left + 1, 0),
                paddingRight: Math.max(insets.right + 11, 0),
              }]}>
                <StatusBar barStyle="light-content" translucent={true} hidden={false} backgroundColor="transparent" />
                <Image
                  source={{ uri: story.mediaUri || `https://picsum.photos/seed/${story.id}/800/1600` }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
                <View style={styles.touchAreaContainer}>
                  <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOutLeft}>
                    <View style={styles.touchAreaLeft} />
                  </TouchableWithoutFeedback>
                  <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOutRight}>
                    <View style={styles.touchAreaRight} />
                  </TouchableWithoutFeedback>
                </View>
                <View style={styles.viewerOverlay} pointerEvents="box-none">
                  <View style={styles.progressBarContainer}>
                    {activeUser.stories.map((s: any, i: number) => (
                      <View key={s.id} style={styles.progressSegment}>
                        <Animated.View style={[
                          styles.progressSegmentFill,
                          {
                            width: i === activeStoryIndex
                              ? progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                              : i < activeStoryIndex ? '100%' : '0%'
                          }
                        ]} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.viewerHeader} pointerEvents="box-none">
                    <TouchableOpacity onPress={() => setActiveStatusIndex(null)} style={styles.viewerBackBtn}>
                      <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Image source={{ uri: activeUser.avatar }} style={styles.viewerAvatar} />
                    <View style={styles.viewerHeaderInfo}>
                      <Text style={styles.viewerName}>{activeUser.name}</Text>
                      <Text style={styles.viewerTime}>{story.time}</Text>
                    </View>
                    <TouchableOpacity style={styles.viewerMoreBtn} onPress={() => setViewerMenuVisible(true)}>
                      <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Caption Overlay */}
                  {story.caption ? (
                    <View style={[styles.viewerCaptionContainer, { paddingBottom: insets.bottom + 20 }]}>
                      <Text style={styles.viewerCaptionText}>{story.caption}</Text>
                    </View>
                  ) : (
                    <View style={[styles.viewerReplyContainer, { paddingBottom: insets.bottom + 10 }]}>
                      <MaterialIcons name="keyboard-arrow-up" size={24} color="#FFFFFF" />
                      <Text style={styles.viewerReplyText}>Reply</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })()}
        </SafeAreaView>

        {/* Viewer Dropdown Menu */}
        <Modal
          visible={viewerMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setViewerMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setViewerMenuVisible(false)}>
            <View style={styles.viewerMenuOverlay}>
              <View style={[styles.viewerDropdown, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50 }]}>
                <TouchableOpacity style={styles.viewerDropdownItem} onPress={() => { setViewerMenuVisible(false); alert('Message'); }}>
                  <Text style={[styles.viewerDropdownText, { color: colors.textPrimary }]}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewerDropdownItem} onPress={() => { setViewerMenuVisible(false); alert('Voice call'); }}>
                  <Text style={[styles.viewerDropdownText, { color: colors.textPrimary }]}>Voice call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewerDropdownItem} onPress={() => { setViewerMenuVisible(false); alert('Video call'); }}>
                  <Text style={[styles.viewerDropdownText, { color: colors.textPrimary }]}>Video call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewerDropdownItem} onPress={() => { setViewerMenuVisible(false); alert('View contact'); }}>
                  <Text style={[styles.viewerDropdownText, { color: colors.textPrimary }]}>View contact</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewerDropdownItem} onPress={() => { setViewerMenuVisible(false); alert('Hide'); }}>
                  <Text style={[styles.viewerDropdownText, { color: colors.textPrimary }]}>Hide</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      </Modal>

      {/* Media Type Options Bottom Modal */}
      <Modal
        visible={uploadOptionsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUploadOptionsVisible(false)}
      >
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPressOut={() => setUploadOptionsVisible(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom || 20, height: 760 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={[styles.bottomSheetTitle, { color: colors.textPrimary }]}>Choose status</Text>

            <FlatList
              data={[{ id: 'camera' } as any, ...recentMedia]}
              keyExtractor={item => item.id}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={{ justifyContent: 'flex-start', gap: 4 }}
              contentContainerStyle={{ gap: 4, paddingBottom: 20 }}
              onEndReached={() => {
                if (hasNextMediaPage && mediaCursor) {
                  loadMediaPage(mediaCursor);
                }
              }}
              onEndReachedThreshold={0.5}
              renderItem={({ item }) => {
                if (item.id === 'camera') {
                  return (
                    <TouchableOpacity style={[styles.mediaTile, { backgroundColor: isDark ? '#202C33' : '#F0F2F5', justifyContent: 'center', alignItems: 'center' }]} onPress={() => handleAddStatus(true)}>
                      <MaterialIcons name="camera-alt" size={32} color={isDark ? '#FFF' : '#008080'} />
                      <Text style={{ color: isDark ? '#FFF' : '#008080', fontSize: 12, marginTop: 4, fontWeight: '600' }}>Camera</Text>
                    </TouchableOpacity>
                  );
                }
                const ast = item as MediaLibrary.Asset;
                return (
                  <TouchableOpacity style={styles.mediaTile} onPress={() => handleMediaPick(ast)}>
                    <Image source={{ uri: ast.uri }} style={styles.mediaThumbnail} />
                    {ast.mediaType === 'video' && (
                      <View style={styles.videoBadge}>
                        <MaterialIcons name="videocam" size={14} color="#FFF" />
                        <Text style={styles.videoBadgeText}>{Math.floor(ast.duration)}s</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FAB for adding status natively within the Updates tab */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.iconBg }]}
        activeOpacity={0.8}
        onPress={() => setUploadOptionsVisible(true)}
      >
        <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Upload Success/Error Toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: isDark ? '#233138' : '#00A884',
              transform: [{ translateY: toastAnim }],
              bottom: insets.bottom + 100,
            }
          ]}
        >
          <MaterialIcons name="check-circle" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingBottom: 100,
  },
  statusItem: {
    flexDirection: 'row',
    paddingLeft: 16,
    height: 76,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatarContainer: {
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ccc',
  },
  addIconContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 16,
    marginLeft: 16,
  },
  itemInfoTouchable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  statusName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusTime: {
    fontSize: 14,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  viewerImage: {
    flex: 1,
    width: '100%',
  },
  viewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  progressBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 10,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  progressSegmentFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  viewerBackBtn: {
    padding: 8,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  viewerHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  viewerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewerTime: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewerMoreBtn: {
    padding: 8,
  },
  touchAreaContainer: {
    flexDirection: 'row',
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  touchAreaLeft: {
    flex: 1,
  },
  touchAreaRight: {
    flex: 2,
  },
  viewerMenuOverlay: {
    flex: 1,
  },
  viewerDropdown: {
    position: 'absolute',
    top: 40,
    right: 15,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 160,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  viewerDropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  viewerDropdownText: {
    fontSize: 16,
    fontWeight: '400',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  mediaTile: {
    width: (Dimensions.get('window').width - 48) / 3, // Roughly 1/3 of screen width
    height: (Dimensions.get('window').width - 48) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: '#FFF',
    fontSize: 10,
    marginLeft: 2,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 10,
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  viewerCaptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingTop: 15,
    alignItems: 'center',
  },
  viewerCaptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  viewerReplyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 10,
  },
  viewerReplyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: -4,
  },
});
