import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { fetchEmojisByCategory, LocalEmoji } from '../../lib/emojiService';

const { width } = Dimensions.get('window');
const COLUMNS = 8;
const CELL_SIZE = Math.floor(width / COLUMNS);

const CATEGORIES = [
  { id: 'Smileys & Emotion', icon: '😀' },
  { id: 'People & Body', icon: '🧑' },
  { id: 'Animals & Nature', icon: '🦄' },
  { id: 'Food & Drink', icon: '🍔' },
  { id: 'Activities', icon: '⚾️' },
  { id: 'Travel & Places', icon: '✈️' },
  { id: 'Objects', icon: '💡' },
  { id: 'Symbols', icon: '🔣' },
  { id: 'Flags', icon: '🏳️‍🌈' },
];

interface EmojiCellProps {
  item: LocalEmoji;
  onSelect: (emoji: string) => void;
}

const EmojiCell = React.memo(({ item, onSelect }: EmojiCellProps) => (
  <TouchableOpacity
    style={styles.cell}
    onPress={() => onSelect(item.emoji)}
    activeOpacity={0.6}
  >
    <Text style={[styles.emojiText, { color: useColorScheme() === 'dark' ? '#E9EDEF' : '#111111' }]}>
      {item.emoji}
    </Text>
  </TouchableOpacity>
));

interface FastEmojiPickerProps {
  onEmojiSelected: (emoji: string) => void;
  height?: number;
}

const FastEmojiPicker: React.FC<FastEmojiPickerProps> = ({ onEmojiSelected, height = 300 }) => {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [emojis, setEmojis] = useState<LocalEmoji[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadEmojis = async () => {
      setLoading(true);
      const data = await fetchEmojisByCategory(activeCategory);
      if (isMounted) {
        setEmojis(data);
        setLoading(false);
      }
    };
    loadEmojis();
    return () => { isMounted = false; };
  }, [activeCategory]);

  const renderItem = useCallback(({ item }: { item: LocalEmoji }) => (
    <EmojiCell item={item} onSelect={onEmojiSelected} />
  ), [onEmojiSelected]);

  return (
    <View style={[styles.container, { height, backgroundColor: isDark ? '#111B21' : '#F0F0F0' }]}>
      {/* Category Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: isDark ? '#222D34' : '#E9EDEF' }]}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.tab,
              activeCategory === cat.id && [styles.activeTab, { borderBottomColor: '#00A884' }]
            ]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={styles.tabIcon}>{cat.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#00A884" size="large" />
          </View>
        ) : (
          <FlatList
            data={emojis}
            renderItem={renderItem}
            keyExtractor={item => item.unified}
            numColumns={COLUMNS}
            initialNumToRender={50}
            maxToRenderPerBatch={50}
            windowSize={5}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: CELL_SIZE,
              offset: CELL_SIZE * Math.floor(index / COLUMNS),
              index,
            })}
          />
        )}
      </View>
    </View>
  );
};

export default FastEmojiPicker;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    height: 50,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabIcon: {
    fontSize: 20,
  },
  listContainer: {
    flex: 1,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: CELL_SIZE - 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
