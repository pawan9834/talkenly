import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  useColorScheme,
  StatusBar,
  Dimensions,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { firestore } from '../lib/firebase';
import { Collections } from '../lib/firebase';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'MediaLinksDocs'>;
type RouteType = RouteProp<RootStackParamList, 'MediaLinksDocs'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Media', 'Links', 'Docs'];

// Regex to detect URLs in message text (robust version)
const URL_REGEX = /(?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})\S*/gi;

export default function MediaLinksDocsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { chatId, recipientName } = route.params;
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mediaMessages, setMediaMessages] = useState<any[]>([]);
  const [linkMessages, setLinkMessages] = useState<{ url: string; text: string; time: string }[]>([]);
  const [docMessages, setDocMessages] = useState<any[]>([]);

  const scrollRef = useRef<ScrollView>(null);

  const colors = useMemo(() => ({
    background: isDark ? '#111B21' : '#F0F2F5',
    headerBg: isDark ? '#202C33' : '#008080',
    cardBg: isDark ? '#1F2C34' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#E9EDEF',
    accent: '#00A884',
    tabIndicator: '#00A884',
  }), [isDark]);

  const fetchMessages = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const snapshot = await firestore()
        .collection(Collections.CHATS)
        .doc(chatId)
        .collection(Collections.MESSAGES)
        .orderBy('timestamp', 'desc')
        .get();

      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Filter media (images and videos)
      const media = allMessages
        .filter(msg => (msg.imageUrl || msg.mediaUrl) && (msg.type === 'image' || msg.type === 'video'))
        .map(msg => ({
          ...msg,
          mediaUrl: msg.mediaUrl || msg.imageUrl, // normalize field
          time: msg.timestamp?.toDate
            ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recently'
        }));
      setMediaMessages(media);

      // Filter links from text messages
      const links: { url: string; text: string; time: string }[] = [];
      allMessages.forEach(msg => {
        if (msg.text) {
          const matches = msg.text.match(URL_REGEX);
          if (matches) {
            matches.forEach((url: string) => {
              links.push({
                url,
                text: msg.text,
                time: msg.timestamp?.toDate
                  ? msg.timestamp.toDate().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Recently',
              });
            });
          }
        }
      });
      setLinkMessages(links);

      // Filter docs
      const docs = allMessages.filter(msg => msg.docUrl || msg.type === 'document');
      setDocMessages(docs);
    } catch (error) {
      console.error('[MediaLinksDocs] Fetch failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  const handleRefresh = () => {
    fetchMessages(true);
  };

  const switchTab = (index: number) => {
    setActiveTab(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setActiveTab(index);
  };

  // ── Empty State ──────────────────────────────────────────────────────────────
  const EmptyState = ({ icon, label }: { icon: string; label: string }) => (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon as any} size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        They will appear here once shared in this chat
      </Text>
    </View>
  );

  // ── Media Grid ───────────────────────────────────────────────────────────────
  const MediaTab = () => (
    <View style={[styles.tabPage, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : mediaMessages.length === 0 ? (
        <EmptyState icon="images-outline" label="No media shared yet" />
      ) : (
        <FlatList
          data={mediaMessages}
          numColumns={3}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('ImageViewer', {
                  mediaMessages: mediaMessages,
                  initialIndex: index,
                  recipientName: recipientName,
                });
              }}
            >
              <Image
                source={{ uri: item.mediaUrl }}
                style={[styles.mediaThumb, { borderColor: colors.background }]}
              />
              {item.type === 'video' && (
                <View style={styles.videoIconOverlay}>
                  <Ionicons name="play" size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.mediaGrid}
        />
      )}
    </View>
  );

  // ── Links List ───────────────────────────────────────────────────────────────
  const LinksTab = () => (
    <View style={[styles.tabPage, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : linkMessages.length === 0 ? (
        <EmptyState icon="link-outline" label="No links shared yet" />
      ) : (
        <FlatList
          data={linkMessages}
          keyExtractor={(item, idx) => `${item.url}-${idx}`}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.linkRow, { backgroundColor: colors.cardBg }]}
              onPress={() => {
                const fullUrl = item.url.toLowerCase().startsWith('http') ? item.url : `https://${item.url}`;
                Linking.openURL(fullUrl).catch(() => Alert.alert('Error', 'Could not open link'));
              }}
            >
              <View style={[styles.linkIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="link" size={22} color={colors.accent} />
              </View>
              <View style={styles.linkText}>
                <Text style={[styles.linkUrl, { color: colors.accent }]} numberOfLines={1}>{item.url}</Text>
                <Text style={[styles.linkDate, { color: colors.textSecondary }]}>{item.time}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  // ── Docs List ────────────────────────────────────────────────────────────────
  const DocsTab = () => (
    <View style={[styles.tabPage, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : docMessages.length === 0 ? (
        <EmptyState icon="document-outline" label="No documents shared yet" />
      ) : (
        <FlatList
          data={docMessages}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.linkRow, { backgroundColor: colors.cardBg }]}
              onPress={() => item.docUrl && Linking.openURL(item.docUrl)}
            >
              <View style={[styles.linkIcon, { backgroundColor: '#FF980020' }]}>
                <MaterialIcons name="insert-drive-file" size={22} color="#FF9800" />
              </View>
              <View style={styles.linkText}>
                <Text style={[styles.linkUrl, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.docName || 'Document'}
                </Text>
                <Text style={[styles.linkDate, { color: colors.textSecondary }]}>{item.docSize || ''}</Text>
              </View>
              <Feather name="download" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{recipientName}</Text>
          <Text style={styles.headerSubtitle}>Media, links and docs</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.headerBg }]}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === index && styles.tabItemActive]}
            onPress={() => switchTab(index)}
          >
            <Text style={[
              styles.tabLabel,
              activeTab === index
                ? { color: '#FFFFFF', fontWeight: '700' }
                : { color: 'rgba(255,255,255,0.6)' }
            ]}>
              {tab}
            </Text>
            {activeTab === index && (
              <View style={[styles.tabIndicator, { backgroundColor: '#FFFFFF' }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Swipeable Content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        <MediaTab />
        <LinksTab />
        <DocsTab />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
  },
  backBtn: { marginRight: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 1 },
  tabBar: {
    flexDirection: 'row',
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 14, letterSpacing: 0.5 },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
  },
  tabPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  mediaGrid: { padding: 2 },
  mediaThumb: {
    width: (SCREEN_WIDTH - 4) / 3,
    height: (SCREEN_WIDTH - 4) / 3,
    borderWidth: 2,
  },
  videoIconOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 2,
    paddingHorizontal: 6,
  },
  divider: { height: 1, marginHorizontal: 16 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: { flex: 1 },
  linkUrl: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  linkDate: { fontSize: 12 },
});
