import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

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
export type { NativeStackNavigationProp };
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user, hasProfile } = useAuthStore();

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