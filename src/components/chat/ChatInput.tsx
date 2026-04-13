import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Keyboard, Animated, Platform, BackHandler } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastEmojiPicker from './FastEmojiPicker';

interface ChatInputProps {
  onSend: (text: string) => void;
  chatId: string;
  userPhone: string;
  colors: {
    inputBg: string;
    inputAreaBg: string;
    icon: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateTypingStatus } from '../../lib/chatService';

const KEYBOARD_OFFSET = 51;

const ChatInput: React.FC<ChatInputProps> = ({ onSend, chatId, userPhone, colors }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [lastKeyboardHeight, setLastKeyboardHeight] = useState(300);
  const [manualKeyboardHeight, setManualKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const isSwitchingRef = useRef(false);

  // Typing status logic
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (isEmojiPickerVisible) {
        toggleEmojiPicker(); // Switch back to keyboard
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isEmojiPickerVisible]);

  useEffect(() => {
    if (!chatId || !userPhone) return;

    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(chatId, userPhone, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(chatId, userPhone, false);
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [message, chatId, userPhone]);

  useEffect(() => {
    // We use 'Show' events for Android for instant snapping
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setLastKeyboardHeight(height);
      setManualKeyboardHeight(height + KEYBOARD_OFFSET);
      setIsKeyboardVisible(true);

      if (!isSwitchingRef.current) {
        setIsEmojiPickerVisible(false);
      }
      isSwitchingRef.current = false;
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      if (!isSwitchingRef.current) {
        setManualKeyboardHeight(0);
      }
      isSwitchingRef.current = false;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = () => {
    if (message.trim().length > 0) {
      onSend(message.trim());
      setMessage('');
      setIsTyping(false);
      updateTypingStatus(chatId, userPhone, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const toggleEmojiPicker = () => {
    if (isEmojiPickerVisible) {
      isSwitchingRef.current = true;
      inputRef.current?.focus();
    } else {
      isSwitchingRef.current = true;
      Keyboard.dismiss();
      setIsEmojiPickerVisible(true);
      setManualKeyboardHeight(lastKeyboardHeight + KEYBOARD_OFFSET);
    }
  };

  const isAnyKeyboardOpen = isKeyboardVisible || isEmojiPickerVisible;

  return (
    <View style={{ backgroundColor: colors.inputAreaBg }}>
      <View style={{
        paddingBottom: isAnyKeyboardOpen ? 0 : Math.max(insets.bottom, 15),
        paddingTop: 8,
      }}>
        <View style={styles.inputContainer}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg }]}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleEmojiPicker}>
              <MaterialCommunityIcons
                name={isEmojiPickerVisible ? "keyboard-outline" : "emoticon-outline"}
                size={24}
                color={colors.icon}
              />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Message"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={message}
              onChangeText={setMessage}
              onFocus={() => setIsEmojiPickerVisible(false)}
            />

            <TouchableOpacity style={styles.iconButton}>
              <MaterialCommunityIcons
                name="paperclip"
                size={24}
                color={colors.icon}
                style={{ transform: [{ rotate: '-45deg' }] }}
              />
            </TouchableOpacity>

            {message.length === 0 && (
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="camera" size={24} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.accent }]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            {message.trim().length > 0 ? (
              <MaterialCommunityIcons name="send" size={22} color="#FFFFFF" style={{ marginLeft: 3 }} />
            ) : (
              <MaterialCommunityIcons name="microphone" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: manualKeyboardHeight }}>
        {isEmojiPickerVisible && (
          <FastEmojiPicker
            onEmojiSelected={emoji => setMessage(prev => prev + emoji)}
            height={lastKeyboardHeight}
          />
        )}
      </View>
    </View>
  );
};

export default ChatInput;

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 12,
    minHeight: 48,
    maxHeight: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingTop: 8,
    paddingBottom: 8,
    marginLeft: 8,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
});
