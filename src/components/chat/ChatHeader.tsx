import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  navigation: any;
  recipientName: string;
  recipientPhoto?: string | null;
  recipientUid?: string;
  recipientPhone?: string;
  isOnline: boolean;
  isTyping: boolean;
  colors: {
    headerBg: string;
  };
  onDiagnostics?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  navigation, 
  recipientName, 
  recipientPhoto, 
  recipientUid,
  recipientPhone,
  isOnline,
  isTyping,
  colors,
  onDiagnostics
}) => {
  return (
    <View style={{ backgroundColor: colors.headerBg }}>
      <SafeAreaView
        edges={['top']}
        style={{ backgroundColor: colors.headerBg }}
      >
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userInfo}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Profile', {
                userId: recipientUid,
                name: recipientName,
                photo: recipientPhoto,
                phone: recipientPhone
              })}
            >
              <View style={styles.avatarContainer}>
                {recipientPhoto ? (
                  <Image source={{ uri: recipientPhoto }} style={styles.headerAvatar} />
                ) : (
                  <FontAwesome5 name="user-circle" size={36} color="#CCCCCC" />
                )}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.nameText} numberOfLines={1}>{recipientName}</Text>
                {isTyping ? (
                  <Text style={styles.statusText}>typing...</Text>
                ) : isOnline ? (
                  <Text style={styles.statusText}>online</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            {onDiagnostics && (
              <TouchableOpacity style={styles.headerIcon} onPress={onDiagnostics}>
                <Ionicons name="bug-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerIcon}>
              <MaterialCommunityIcons name="video" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Feather name="more-vertical" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ChatHeader;

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    flex: 1,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 10,
  },
});
