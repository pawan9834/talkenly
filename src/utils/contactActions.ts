import { Linking, Share, Alert, Platform } from 'react-native';

/**
 * Opens the device's native contacts application.
 * Note: Android uses a direct content URL, while iOS generally restricts direct launching.
 */
export const openNativeContacts = async () => {
  try {
    if (Platform.OS === 'android') {
      // Common content URI for Android contacts
      await Linking.openURL('content://contacts/people/');
    } else {
      // iOS doesn't have a reliable public URL scheme to open the Contacts app directly.
      // Apple recommends using the ContactsUI framework (native) or expo-contacts in-app.
      Alert.alert(
        'System Restriction',
        'On iOS, please use the system Search or the Contacts app from your home screen to manage contacts manually.'
      );
    }
  } catch (error) {
    console.error('Error opening native contacts:', error);
    Alert.alert('Error', 'Unable to open the native contacts app on this device.');
  }
};

/**
 * Opens the system share sheet to invite friends to the application.
 */
export const inviteAFriend = async () => {
  try {
    const appName = 'Talkenly';
    const message = `Join me on ${appName}! It is a fast, simple and secure messaging app. Download it here: https://yourapp.com/download`;
    
    const result = await Share.share({
      message,
      title: `Invite to ${appName}`,
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // shared with activity type of result.activityType
      } else {
        // shared
      }
    } else if (result.action === Share.dismissedAction) {
      // dismissed
    }
  } catch (error) {
    console.error('Error sharing invite:', error);
    Alert.alert('Error', 'Unable to open sharing options.');
  }
};
