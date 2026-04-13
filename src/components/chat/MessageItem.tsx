import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface ChatMessageUI {
  id: string;
  text: string;
  time: string;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'read' | 'pending';
}

interface MessageItemProps {
  item: ChatMessageUI;
  colors: {
    bubbleSelf: string;
    bubbleOther: string;
    textPrimary: string;
    textSecondary: string;
  };
}

const MessageItem: React.FC<MessageItemProps> = ({ item, colors }) => {
  return (
    <View style={[styles.messageRow, item.isMe ? styles.myMessageRow : styles.otherMessageRow]}>
      <View
        style={[
          styles.bubble,
          item.isMe
            ? [styles.myBubble, { backgroundColor: colors.bubbleSelf }]
            : [styles.otherBubble, { backgroundColor: colors.bubbleOther }],
        ]}
      >
        <Text style={[styles.messageText, { color: colors.textPrimary }]}>{item.text}</Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.messageTime, { color: colors.textSecondary }]}>{item.time}</Text>
          {item.isMe && (
            <MaterialCommunityIcons
              name={
                item.status === 'pending' ? 'clock-outline' :
                item.status === 'sent' ? 'check' :
                'check-all'
              }
              size={16}
              color={item.status === 'read' ? '#34B7F1' : colors.textSecondary}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default React.memo(MessageItem);

const styles = StyleSheet.create({
  messageRow: {
    width: '100%',
    marginVertical: 4,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myBubble: {
    borderTopRightRadius: 0,
  },
  otherBubble: {
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  statusIcon: {
    marginLeft: 4,
  },
});
