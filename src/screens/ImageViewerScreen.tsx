import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { RootStackParamList } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<RootStackParamList, 'ImageViewer'>;
type ViewerRouteProp = RouteProp<RootStackParamList, 'ImageViewer'>;

export default function ImageViewerScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ViewerRouteProp>();
  const { mediaMessages, initialIndex, recipientName } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const onScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== currentIndex) {
      setCurrentIndex(slide);
    }
  };

  const handleOptionPress = (option: string) => {
    Alert.alert(option, 'This feature is coming soon!');
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.mediaContainer}>
        {item.mediaType === 'video' ? (
          <Video
            source={{ uri: item.mediaUrl }}
            style={styles.fullMedia}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay={false}
          />
        ) : (
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.fullMedia}
            resizeMode="contain"
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.senderText}>{recipientName}</Text>
            <Text style={styles.dateText}>{mediaMessages[currentIndex]?.time || ''}</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOptionPress('Star')}>
              <Ionicons name="star-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOptionPress('Forward')}>
              <MaterialCommunityIcons name="share-outline" size={24} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOptionPress('Share')}>
              <Ionicons name="share-social-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOptionPress('Options')}>
              <Ionicons name="ellipsis-vertical" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Media List */}
      <FlatList
        ref={flatListRef}
        data={mediaMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.flatList}
      />

      {/* Footer / Caption */}
      {mediaMessages[currentIndex]?.text && mediaMessages[currentIndex].text !== '📷 Photo' && mediaMessages[currentIndex].text !== '📽️ Video' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.captionText}>{mediaMessages[currentIndex].text}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  senderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  flatList: {
    flex: 1,
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  captionText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
});
