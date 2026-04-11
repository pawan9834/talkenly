import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  useColorScheme,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';

// Sample Call Data
const CALLS = [
  { id: '1', name: 'Sara Khan', type: 'video', direction: 'incoming', status: 'answered', time: 'Today, 2:30 PM', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: '2', name: 'Deepak Dev', type: 'voice', direction: 'outgoing', status: 'missed', time: 'Today, 11:15 AM', avatar: 'https://i.pravatar.cc/150?u=4' },
  { id: '3', name: 'Roshan Business', type: 'voice', direction: 'incoming', status: 'missed', time: 'Yesterday, 8:45 PM', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: '4', name: 'Sara Khan', type: 'video', direction: 'incoming', status: 'answered', time: 'Yesterday, 1:20 PM', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: '5', name: 'Tech Team', type: 'voice', direction: 'outgoing', status: 'answered', time: 'Monday, 10:00 AM', avatar: 'https://i.pravatar.cc/150?u=2' },
];

export default function CallsScreen() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const colors = {
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    border: isDark ? '#222D34' : '#F2F2F2',
    iconGreen: '#00A884',
    iconRed: '#F15C6D',
    linkBg: isDark ? '#00A884' : '#00A884',
  };

  const renderCallItem = ({ item }: { item: typeof CALLS[0] }) => {
    const isMissed = item.status === 'missed';
    const isIncoming = item.direction === 'incoming';

    return (
      <TouchableOpacity style={styles.callItem} activeOpacity={0.7}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={[styles.callInfo, { borderBottomColor: colors.border }]}>
          <View style={styles.callDetails}>
            <Text style={[styles.callName, { color: isMissed ? colors.iconRed : colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.callStatusRow}>
              <MaterialIcons
                name={isIncoming ? 'call-made' : 'call-received'}
                size={16}
                color={isMissed ? colors.iconRed : colors.iconGreen}
                style={{ transform: [{ rotate: isIncoming ? '0deg' : '180deg' }] }}
              />
              <Text style={[styles.callTime, { color: colors.textSecondary }]}>
                {item.time}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionIconBtn}>
            <MaterialIcons
              name={item.type === 'video' ? 'videocam' : 'call'}
              size={24}
              color={colors.iconGreen}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Create Call Link Section */}
      <TouchableOpacity style={styles.linkBanner} activeOpacity={0.7}>
        <View style={[styles.linkIconCircle, { backgroundColor: colors.iconGreen }]}>
          <Feather name="link" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.linkInfo}>
          <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Create call link</Text>
          <Text style={[styles.linkSubtitle, { color: colors.textSecondary }]}>Share a link for your Talkenly call</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionHeaderText, { color: colors.textPrimary }]}>Recent</Text>
      </View>

      <FlatList
        data={CALLS}
        keyExtractor={(item) => item.id}
        renderItem={renderCallItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
  linkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    marginLeft: 16,
  },
  linkTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  linkSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  callItem: {
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
  callInfo: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  callDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  callName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  callStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callTime: {
    fontSize: 14,
    marginLeft: 6,
  },
  actionIconBtn: {
    padding: 10,
  },
});
