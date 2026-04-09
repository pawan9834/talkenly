import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  useColorScheme,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { auth } from '../lib/firebase';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

// Sample Data for UI
const CHATS = [
  { id: '1', name: 'Roshan Business', message: 'Hey, are we still on for the project?', time: '12:45 PM', unread: 2, avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Tech Team', message: 'New update pushed to main branch.', time: '11:20 AM', unread: 0, avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Sara Khan', message: 'The designs look great!', time: 'Yesterday', unread: 5, avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'Deepak Dev', message: 'Fixed the auth bug.', time: 'Yesterday', unread: 0, avatar: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'Talkenly Community', message: 'Welcome to the group!', time: 'Monday', unread: 12, avatar: 'https://i.pravatar.cc/150?u=5' },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'Chats' | 'Updates' | 'Calls'>('Chats');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Paging Logic
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const flatListRef = React.useRef<FlatList>(null);
  const tabWidth = width / 3;

  const handleTabPress = (tabIndex: number) => {
    flatListRef.current?.scrollToOffset({
      offset: tabIndex * width,
      animated: true,
    });
  };

  const onMomentumScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    const tabs = ['Chats', 'Updates', 'Calls'] as const;
    setActiveTab(tabs[index]);
  };

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: [0, width, width * 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  // WhatsApp-inspired Premium Teal Palette
  const colors = {
    background: isDark ? '#111B21' : '#FFFFFF',
    headerBg: isDark ? '#1F2C34' : '#008080',
    headerText: '#FFFFFF',
    tabText: isDark ? '#8696A0' : '#B2DFDB',
    tabTextActive: '#FFFFFF',
    tabIndicator: isDark ? '#00A884' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#202C33' : '#F2F2F2',
    icon: isDark ? '#8696A0' : '#FFFFFF',
    unreadBadge: isDark ? '#00A884' : '#008080',
    unreadText: '#FFFFFF',
    fabBg: isDark ? '#00A884' : '#008080',
    statusBar: isDark ? '#1F2C34' : '#008080',
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (e) {
      console.error(e);
    }
  };

  const renderChatItem = ({ item }: { item: typeof CHATS[0] }) => (
    <TouchableOpacity
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() => 
        navigation.navigate('Chat', { 
          chatId: item.id, 
          recipientName: item.name, 
          recipientPhone: '+91XXXXXXXXXX' 
        })
      }
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={[styles.chatInfo, { borderBottomColor: colors.border }]}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.chatTime, { color: item.unread > 0 ? colors.unreadBadge : colors.textSecondary }]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={[styles.chatMsg, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.message}
          </Text>
          {item.unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.unreadBadge }]}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.statusBar} />
      
      <View style={[styles.main, { backgroundColor: colors.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={styles.title}>Talkenly</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="camera" size={22} color={colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="search" size={22} color={colors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setIsMenuVisible(true)}>
              <Feather name="more-vertical" size={22} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DROPDOWN MENU */}
        <Modal
          visible={isMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
            <View style={styles.menuOverlay}>
              <View style={[styles.menuContent, { backgroundColor: isDark ? '#233138' : '#FFFFFF' }]}>
                <TouchableOpacity style={styles.menuItem} onPress={() => setIsMenuVisible(false)}>
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>New group</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => setIsMenuVisible(false)}>
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>Starred messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => setIsMenuVisible(false)}>
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>Read all</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => { setIsMenuVisible(false); navigation.navigate('Settings'); }}
                >
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* TABS */}
        <View style={[styles.tabBar, { backgroundColor: colors.headerBg }]}>
          {(['Chats', 'Updates', 'Calls'] as const).map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => handleTabPress(index)}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === tab ? colors.tabTextActive : colors.tabText }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
          <Animated.View style={[
            styles.indicator, 
            { 
              width: tabWidth,
              backgroundColor: colors.tabIndicator,
              transform: [{ translateX: indicatorTranslateX }] 
            }
          ]} />
        </View>

        {/* PAGER (Swipeable Content) */}
        <Animated.FlatList
          ref={flatListRef}
          data={['Chats', 'Updates', 'Calls']}
          keyExtractor={(item) => item}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          renderItem={({ item }) => {
            if (item === 'Chats') {
              return (
                <View style={{ width }}>
                  <FlatList
                    data={CHATS}
                    keyExtractor={(chat) => chat.id}
                    renderItem={renderChatItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              );
            }
            return (
              <View style={[styles.center, { width }]}>
                <Text style={{ color: colors.textSecondary }}>{item} feature coming soon.</Text>
              </View>
            );
          }}
        />

        {/* FAB */}
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.fabBg }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Contacts')}
        >
          <MaterialIcons name="chat" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 20,
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    height: 48,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  list: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    paddingLeft: 16,
    height: 76,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ccc',
  },
  chatInfo: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 16,
    marginLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMsg: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingRight: 10,
  },
  menuContent: {
    width: 200,
    borderRadius: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingVertical: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
  },
});