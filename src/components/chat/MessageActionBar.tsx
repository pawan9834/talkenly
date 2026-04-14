import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessageUI } from './MessageItem';

interface MessageActionBarProps {
  selectedCount: number;
  selectedMessages: ChatMessageUI[];
  headerBg: string;
  onDeselect: () => void;
  onReply: (msgs: ChatMessageUI[]) => void;
  onDelete: (msgs: ChatMessageUI[]) => void;
  onForward: (msgs: ChatMessageUI[]) => void;
  onStar: (msgs: ChatMessageUI[]) => void;
  onInfo: (msgs: ChatMessageUI[]) => void;
}

const MessageActionBar: React.FC<MessageActionBarProps> = ({
  selectedCount,
  selectedMessages,
  headerBg,
  onDeselect,
  onReply,
  onDelete,
  onForward,
  onStar,
  onInfo,
}) => {
  const actions = [
    {
      icon: <Ionicons name="arrow-undo" size={22} color="#FFFFFF" />,
      label: 'Reply',
      onPress: () => onReply(selectedMessages),
      show: selectedCount === 1, // reply only makes sense for 1 message
    },
    {
      icon: <Ionicons name="star-outline" size={22} color="#FFFFFF" />,
      label: 'Star',
      onPress: () => onStar(selectedMessages),
      show: true,
    },
    {
      icon: <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" />,
      label: 'Info',
      onPress: () => onInfo(selectedMessages),
      show: selectedCount === 1,
    },
    {
      icon: <MaterialIcons name="delete-outline" size={22} color="#FFFFFF" />,
      label: 'Delete',
      onPress: () => onDelete(selectedMessages),
      show: true,
    },
    {
      icon: <MaterialCommunityIcons name="share-outline" size={22} color="#FFFFFF" />,
      label: 'Forward',
      onPress: () => onForward(selectedMessages),
      show: true,
    },
  ];

  return (
    <View style={[styles.wrapper, { backgroundColor: headerBg }]}>
      <SafeAreaView edges={['top']} style={styles.bar}>
        {/* Back / Deselect */}
        <TouchableOpacity onPress={onDeselect} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Selected count */}
        <Text style={styles.countText}>{selectedCount}</Text>

        {/* Action icons — only show relevant ones */}
        <View style={styles.actions}>
          {actions.filter(a => a.show).map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionBtn}
              onPress={action.onPress}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {action.icon}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default MessageActionBar;

const styles = StyleSheet.create({
  wrapper: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 56,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 10,
  },
});
