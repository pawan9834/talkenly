import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InviteBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onInvite: () => void;
  contactName: string;
  phoneNumber: string;
}

export default function InviteBottomSheet({
  visible,
  onClose,
  onInvite,
  contactName,
  phoneNumber,
}: InviteBottomSheetProps) {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const colors = {
    background: isDark ? '#1F2C34' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    button: '#00A884', // WhatsApp Green
    buttonText: '#FFFFFF',
    cancelText: isDark ? '#00A884' : '#008080',
    backdrop: 'rgba(0,0,0,0.5)',
    border: isDark ? '#233138' : '#F2F2F2',
    inputBg: isDark ? '#2A3942' : '#F0F2F5',
    iconBg: isDark ? '#233138' : '#E1E1E1',
  };

  const inviteMessage = `Let's chat on Talkenly! It's fast, simple and secure messaging. Download here: https://yourapp.com/download`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.background }]}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Send SMS invite?</Text>
                
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {contactName} isn't on Talkenly. Do you want to invite them to join?
                </Text>

                {/* Profile Icon Section */}
                <View style={styles.profileSection}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.iconBg }]}>
                    <Ionicons name="person" size={40} color={isDark ? '#8696A0' : '#8696A0'} />
                  </View>
                  <Text style={[styles.contactName, { color: colors.textPrimary }]}>{contactName}</Text>
                  <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{phoneNumber}</Text>
                </View>

                {/* Message Box */}
                <View style={[styles.messageBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>Message</Text>
                  <Text style={[styles.messageContent, { color: colors.textPrimary }]}>
                    {inviteMessage}
                  </Text>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={[styles.inviteBtn, { backgroundColor: colors.button }]}
                  onPress={onInvite}
                  activeOpacity={0.8}
                >
                  <Text style={styles.inviteBtnText}>Invite via SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.cancelText }]}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    width: '100%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3B4A54',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
  },
  messageBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  messageLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  inviteBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
