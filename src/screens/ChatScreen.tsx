import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useColorScheme,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { auth, firestore } from '../lib/firebase';
import { sendMessage, subscribeMessages, runFirestoreDiagnostics, subscribeTypingStatus, markMessagesAsRead, markMessagesAsDelivered } from '../lib/chatService';
import { getCachedImage } from '../lib/imageHandler';
import { RootStackParamList } from '../types';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatHeader, ChatInput, MessageItem, ChatMessageUI } from '../components/chat';



type NavProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ChatRouteProp>();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const { chatId, recipientName, recipientPhoto, recipientPhone, recipientUid } = route.params;
  const myPhone = auth().currentUser?.phoneNumber;

  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [cachedRecipientPhoto, setCachedRecipientPhoto] = useState<string | null>(recipientPhoto || null);
  const [recipientStatus, setRecipientStatus] = useState<{ isOnline: boolean; isTyping: boolean }>({
    isOnline: false,
    isTyping: false
  });
  const flatListRef = useRef<FlatList>(null);

  // Real-time recipient status listener
  useEffect(() => {
    let unsubscribe: () => void;

    const setupStatusListener = async () => {
      let targetUid = recipientUid;

      console.log(`[Status] Setting up listener. Initial UID: ${targetUid}, Phone: ${recipientPhone}`);

      if (!targetUid && recipientPhone) {
        console.log(`[Status] UID missing, looking up by phone: ${recipientPhone}`);
        try {
          const snapshot = await firestore()
            .collection('users')
            .where('phoneNumber', '==', recipientPhone)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            targetUid = snapshot.docs[0].id;
            console.log(`[Status] Resolved UID from phone: ${targetUid}`);

            // Self-healing: Cache this UID locally
            try {
              const { getDb } = require('../lib/database');
              const db = getDb();
              await db.runAsync('UPDATE contacts SET uid = ? WHERE normalizedPhone = ?', [targetUid, recipientPhone]);
            } catch (cacheErr) {
              console.warn('[Status] Local cache update failed:', cacheErr);
            }
          }
        } catch (e) {
          console.error(`[Status] Lookup failed:`, e);
        }
      }

      if (targetUid) {
        unsubscribe = firestore()
          .collection('users')
          .doc(targetUid)
          .onSnapshot(doc => {
            if (doc.exists) {
              const data = doc.data();
              setRecipientStatus({ isOnline: !!data?.isOnline });
            }
          }, err => {
            console.error(`[Status] Snapshot error:`, err);
          });
      }
    };

    setupStatusListener();

    // typing status subscription
    const unsubTyping = subscribeTypingStatus(chatId, (statusMap) => {
      if (!recipientPhone) return;
      const recipientKey = recipientPhone.replace(/\+/g, '');
      const isTyping = !!statusMap?.[recipientKey];
      setRecipientStatus(prev => ({ ...prev, isTyping }));
    });

    return () => {
      unsubscribe && unsubscribe();
      unsubTyping && unsubTyping();
    };
  }, [recipientUid, recipientPhone, chatId]);

  // Cache resolution for recipient photo
  useEffect(() => {
    if (recipientPhoto) {
      getCachedImage(recipientPhoto).then(setCachedRecipientPhoto);
    }
  }, [recipientPhoto]);

  const colors = useMemo(() => ({
    background: isDark ? '#0B141A' : '#E5DDD5',
    headerBg: isDark ? '#202C33' : '#008080',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    bubbleSelf: isDark ? '#005C4B' : '#DCF8C6',
    bubbleOther: isDark ? '#202C33' : '#FFFFFF',
    inputBg: isDark ? '#2A3942' : '#FFFFFF',
    inputAreaBg: isDark ? '#111B21' : '#F0F0F0',
    icon: '#8696A0',
    accent: '#00A884',
    statusBar: isDark ? '#202C33' : '#008080',
  }), [isDark]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeMessages(chatId, (firebaseMessages) => {
      const mappedMessages: ChatMessageUI[] = firebaseMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        isMe: msg.senderPhone === myPhone,
        time: msg.timestamp?.toDate ?
          msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
          'Sending...',
        status: msg.status as any,
      }));
      setMessages(mappedMessages);

      // Trigger delivery receipts: Mark incoming messages as delivered
      markMessagesAsDelivered(chatId, myPhone || '');

      // Trigger read receipts: Mark messages sent by the other person as read
      markMessagesAsRead(chatId, myPhone || '');
    });

    return unsubscribe;
  }, [chatId, myPhone]);

  const handleSend = async (text: string) => {
    if (!myPhone || !chatId) return;
    const success = await sendMessage(chatId, myPhone, text, [myPhone, recipientPhone]);
    if (!success) {
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  const handleDiagnostics = async () => {
    const result = await runFirestoreDiagnostics(chatId);
    Alert.alert('Diagnostic Result', result);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.statusBar} />

      <ChatHeader
        navigation={navigation}
        recipientName={recipientName}
        recipientPhoto={cachedRecipientPhoto}
        recipientUid={recipientUid}
        recipientPhone={recipientPhone}
        isOnline={recipientStatus.isTyping ? false : recipientStatus.isOnline}
        isTyping={recipientStatus.isTyping}
        colors={colors}
        onDiagnostics={handleDiagnostics}
      />

      <View style={[styles.chatBody, { backgroundColor: colors.background }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageItem item={item} colors={colors} />}
          ListFooterComponent={recipientStatus.isTyping ? (
            <MessageItem
              item={{
                id: 'typing-indicator',
                text: 'Typing...',
                isMe: false,
                time: '',
                status: 'pending'
              }}
              colors={colors}
            />
          ) : null}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <ChatInput
          onSend={handleSend}
          chatId={chatId}
          userPhone={myPhone || ''}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatBody: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});