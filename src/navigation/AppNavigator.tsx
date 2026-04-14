import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';
import { usePresence } from '../hooks/usePresence';
import { populateEmojiDatabase } from '../lib/emojiService';
import { useEffect } from 'react';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import SetProfileScreen from '../screens/SetProfileScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyStatusDetailsScreen from '../screens/MyStatusDetailsScreen';
import StatusMediaEditor from '../screens/StatusMediaEditor';
import BlockedContactsScreen from '../screens/BlockedContactsScreen';
import MediaLinksDocsScreen from '../screens/MediaLinksDocsScreen';
import StarredMessagesScreen from '../screens/StarredMessagesScreen';
import ImageViewerScreen from '../screens/ImageViewerScreen';
export type { NativeStackNavigationProp };
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user, hasProfile } = useAuthStore();
    
    // Track presence globally for authenticated users
    usePresence();

    useEffect(() => {
        // Initialize emoji database in the background
        populateEmojiDatabase();
    }, []);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                {user ? (
                    hasProfile ? (
                        <>
                            <Stack.Screen name="Home" component={HomeScreen} />
                            <Stack.Screen name="Chat" component={ChatScreen} />
                            <Stack.Screen name="Profile" component={ProfileScreen} />
                            <Stack.Screen name="Contacts" component={ContactsScreen} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                            <Stack.Screen name="MyStatusDetails" component={MyStatusDetailsScreen} />
                            <Stack.Screen name="StatusMediaEditor" component={StatusMediaEditor} />
                            <Stack.Screen name="BlockedContacts" component={BlockedContactsScreen} />
                            <Stack.Screen name="MediaLinksDocs" component={MediaLinksDocsScreen} />
                            <Stack.Screen name="StarredMessages" component={StarredMessagesScreen} />
                            <Stack.Screen name="ImageViewer" component={ImageViewerScreen} />
                        </>
                    ) : (
                        <Stack.Screen name="SetProfile" component={SetProfileScreen} />
                    )
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Otp" component={OtpScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}