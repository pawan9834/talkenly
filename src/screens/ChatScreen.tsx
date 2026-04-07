import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type RoutePropType = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { recipientName, recipientPhone } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{recipientName}</Text>
                    <Text style={styles.headerPhone}>{recipientPhone}</Text>
                </View>
            </View>

            <View style={styles.body}>
                <Text style={styles.placeholder}>💬</Text>
                <Text style={styles.placeholderText}>Chat UI — Phase 2</Text>
                <Text style={styles.placeholderSub}>Real-time Firestore messages coming next</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ECE5DD' },
    header: {
        backgroundColor: '#075E54', flexDirection: 'row',
        alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12,
    },
    backBtn: { color: '#fff', fontSize: 22, paddingRight: 4 },
    headerInfo: { flex: 1 },
    headerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    headerPhone: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    placeholder: { fontSize: 48, marginBottom: 16 },
    placeholderText: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
    placeholderSub: { fontSize: 13, color: '#999', textAlign: 'center' },
});