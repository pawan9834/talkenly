import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PanResponder,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadStatusMedia } from '../lib/statusUploader';
import { RootStackParamList } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import * as ImageManipulator from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<RootStackParamList, 'StatusMediaEditor'>;

interface DrawingPath {
  path: string;
  color: string;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export default function StatusMediaEditor() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { asset: initialAsset } = route.params;

  // States
  const [assetUri, setAssetUri] = useState(initialAsset.uri);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Modes: 'none', 'draw', 'text'
  const [mode, setMode] = useState<'none' | 'draw' | 'text'>('none');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  
  // Drawing States
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  
  // Text States
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');

  const viewShotRef = useRef<View>(null);

  // Drawing Pan Responder
  const drawPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => mode === 'draw',
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths((prev) => [...prev, { path: currentPath, color: currentColor }]);
          setCurrentPath('');
        }
      },
    })
  ).current;

  // Handle Rotation
  const handleRotate = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        assetUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAssetUri(result.uri);
    } catch (e) {
      console.warn('Rotation failed:', e);
    }
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  // Add/Edit Text
  const handleAddText = () => {
    if (tempText.trim()) {
      if (editingTextId) {
        setTexts(prev => prev.map(t => t.id === editingTextId ? { ...t, text: tempText } : t));
      } else {
        const newText: TextOverlay = {
          id: Date.now().toString(),
          text: tempText,
          x: SCREEN_WIDTH / 2 - 50,
          y: SCREEN_HEIGHT / 2 - 20,
          color: currentColor,
          fontSize: 32,
        };
        setTexts(prev => [...prev, newText]);
      }
    }
    setIsTextInputVisible(false);
    setEditingTextId(null);
    setTempText('');
    setMode('none');
  };

  // Draggable Text Element
  const DraggableText = ({ item }: { item: TextOverlay }) => {
    const startPos = useRef({ x: item.x, y: item.y });

    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startPos.current = { x: item.x, y: item.y };
        },
        onPanResponderMove: (_, gestureState) => {
          setTexts(prev => prev.map(t => t.id === item.id ? {
            ...t,
            x: startPos.current.x + gestureState.dx,
            y: startPos.current.y + gestureState.dy
          } : t));
        },
        onPanResponderRelease: () => {
           startPos.current = { x: item.x, y: item.y };
        }
      })
    ).current;

    return (
      <View
        style={[styles.draggableText, { left: item.x, top: item.y }]}
        {...pan.panHandlers}
      >
        <TouchableOpacity 
          onPress={() => {
            setEditingTextId(item.id);
            setTempText(item.text);
            setIsTextInputVisible(true);
          }}
        >
          <Text style={[styles.overlayText, { color: item.color, fontSize: item.fontSize }]}>
            {item.text}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleSend = async () => {
    setIsUploading(true);
    try {
      // 1. Flatten the view into a single image
      const uri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.8,
      });

      // 2. Upload the flattened image
      const finalAsset = { ...initialAsset, uri };
      await uploadStatusMedia(finalAsset, caption);
      
      navigation.navigate('Home');
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Editor Main Canvas */}
      <View ref={viewShotRef} style={styles.editorCanvas} collapsable={false}>
        <Image
          source={{ uri: assetUri }}
          style={styles.previewImage}
          resizeMode="cover"
        />
        
        {/* Drawing Layer */}
        <View 
          style={StyleSheet.absoluteFill} 
          {...drawPanResponder.panHandlers}
          pointerEvents={mode === 'draw' ? 'auto' : 'none'}
        >
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((p, i) => (
              <Path key={i} d={p.path} stroke={p.color} strokeWidth={5} fill="none" strokeLinecap="round" />
            ))}
            {currentPath && (
              <Path d={currentPath} stroke={currentColor} strokeWidth={5} fill="none" strokeLinecap="round" />
            )}
          </Svg>
        </View>

        {/* Text Layer */}
        {texts.map(t => (
          <DraggableText key={t.id} item={t} />
        ))}
      </View>

      {/* Top Controls */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, mode === 'draw' && styles.activeIcon]} onPress={() => setMode(mode === 'draw' ? 'none' : 'draw')}>
            <MaterialIcons name="edit" size={24} color={mode === 'draw' ? '#00A884' : '#FFF'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { setTempText(''); setIsTextInputVisible(true); setMode('text'); }}>
            <MaterialIcons name="title" size={24} color={mode === 'text' ? '#00A884' : '#FFF'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRotate}>
            <MaterialIcons name="crop-rotate" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleUndo}>
            <MaterialIcons name="undo" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Color Picker (Only in Draw/Text mode) */}
      {(mode === 'draw' || isTextInputVisible) && (
        <View style={styles.colorPicker}>
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFFFFF', '#000000'].map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.colorOption, { backgroundColor: c, borderWidth: currentColor === c ? 2 : 0, borderColor: '#FFF' }]} 
              onPress={() => setCurrentColor(c)}
            />
          ))}
        </View>
      )}

      {/* Bottom Controls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomActions}
      >
        <View style={[styles.inputContainer, { marginBottom: insets.bottom + 12 }]}>
          <View style={styles.inputWrapper}>
             <TextInput
              style={styles.input}
              placeholder="Add a caption..."
              placeholderTextColor="#8696A0"
              value={caption}
              onChangeText={setCaption}
              multiline
            />
          </View>

          <TouchableOpacity 
            style={styles.sendBtn} 
            onPress={handleSend}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="send" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Text Input Modal */}
      <Modal visible={isTextInputVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <TextInput
              autoFocus
              style={[styles.modalInput, { color: currentColor }]}
              placeholder="Type something..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={tempText}
              onChangeText={setTempText}
              onSubmitEditing={handleAddText}
              blurOnSubmit={true}
           />
           <TouchableOpacity style={styles.doneBtn} onPress={handleAddText}>
              <Text style={styles.doneText}>Done</Text>
           </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  editorCanvas: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 100,
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 10,
    marginLeft: 4,
  },
  activeIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  colorPicker: {
    position: 'absolute',
    right: 16,
    top: 120,
    width: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 100,
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginVertical: 8,
  },
  draggableText: {
    position: 'absolute',
    padding: 10,
    zIndex: 10,
  },
  overlayText: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#1F2C33',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  input: {
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00A884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalInput: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  doneBtn: {
    marginTop: 40,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#00A884',
    borderRadius: 25,
  },
  doneText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
