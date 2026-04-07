import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { user } = useAuthStore();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.phoneNumber?.slice(-2) ?? '??'}
                    </Text>
                </View>
                <Text style={styles.phone}>{user?.phoneNumber}</Text>
                <Text style={styles.editHint}>Tap to edit profile — Phase 3</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#075E54', flexDirection: 'row',
        alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 16,
    },
    backBtn: { color: '#fff', fontSize: 22 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    avatarSection: { alignItems: 'center', paddingTop: 48 },
    avatar: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    phone: { fontSize: 18, fontWeight: '600', color: '#111', marginBottom: 8 },
    editHint: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
});