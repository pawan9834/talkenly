import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
    createNativeStackNavigator,
    NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '@/screens/ChatScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import LoginScreen from '@/screens/LoginScreen';
import OtpScreen from '@/screens/OtpScreen';



export type { NativeStackNavigationProp };

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user } = useAuthStore();

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            >
                {user ? (
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Chat" component={ChatScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                    </>
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