import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { auth } from '../lib/firebase';
import type { RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const navigation = useNavigation<NavProp>();
    const { user } = useAuthStore();

    const handleLogout = async () => {
        await auth().signOut();
        // Auth state listener in App.tsx navigates back to Login automatically
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Talkenly</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Placeholder — replaced with chat list in Phase 2 */}
            <View style={styles.body}>
                <View style={styles.successBadge}>
                    <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.welcomeTitle}>Phase 1 Complete!</Text>
                <Text style={styles.welcomeSub}>
                    Logged in as{'\n'}
                    <Text style={styles.phoneText}>{user?.phoneNumber}</Text>
                </Text>
                <Text style={styles.nextStep}>Next: Build real-time chat (Phase 2)</Text>

                <TouchableOpacity
                    style={styles.testBtn}
                    onPress={() =>
                        navigation.navigate('Chat', {
                            chatId: 'test-chat-id',
                            recipientName: 'Test User',
                            recipientPhone: '+919876543210',
                        })
                    }
                >
                    <Text style={styles.testBtnText}>Test Chat Screen →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.testBtn, { backgroundColor: '#128C7E', marginTop: 10 }]}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={styles.testBtnText}>Test Profile Screen →</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#075E54',
        paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
    logoutText: { color: '#fff', fontSize: 13 },

    body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    successBadge: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    successIcon: { fontSize: 32, color: '#075E54' },
    welcomeTitle: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
    welcomeSub: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
    phoneText: { color: '#075E54', fontWeight: '600' },
    nextStep: { fontSize: 12, color: '#bbb', marginBottom: 40, fontStyle: 'italic' },

    testBtn: { backgroundColor: '#075E54', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    testBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
});