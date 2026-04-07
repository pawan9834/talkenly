import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/index';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
    const navigation = useNavigation<NavProp>();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePhoneChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
        setPhone(cleaned);
    };

    const handleSendOtp = async () => {
        if (phone.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }
        setLoading(true);
        try {
            const fullPhone = '+91' + phone;
            const confirmation = await auth().signInWithPhoneNumber(fullPhone);
            navigation.navigate('Otp', { phoneNumber: fullPhone, confirmation });
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : 'Something went wrong.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = phone.length !== 10 || loading;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.appName}>Talkenly</Text>
                    <Text style={styles.tagline}>Fast. Simple. Secure.</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Enter your phone number</Text>
                    <Text style={styles.sublabel}>
                        We will send you a one-time SMS verification code.
                    </Text>

                    <View style={styles.inputRow}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="98765 43210"
                            placeholderTextColor="#aaa"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={handlePhoneChange}
                            maxLength={10}
                            autoFocus
                        />
                    </View>

                    <Text style={styles.charCount}>{phone.length} / 10</Text>

                    <TouchableOpacity
                        style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
                        onPress={handleSendOtp}
                        disabled={isButtonDisabled}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>Send OTP</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#fff' },
    container: {
        flexGrow: 1,
        paddingHorizontal: 28,
        paddingTop: 80,
        paddingBottom: 40,
        justifyContent: 'space-between',
    },
    header: { alignItems: 'center', marginBottom: 20 },
    appName: { fontSize: 36, fontWeight: '700', color: '#075E54', letterSpacing: 1 },
    tagline: { fontSize: 14, color: '#999', marginTop: 4 },

    form: { flex: 1, justifyContent: 'center' },
    label: { fontSize: 20, fontWeight: '600', color: '#111', marginBottom: 8, textAlign: 'center' },
    sublabel: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 32, lineHeight: 20 },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ddd',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 6,
    },
    countryCode: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: '#f5f5f5',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    countryCodeText: { fontSize: 15, color: '#333', fontWeight: '500' },
    input: { flex: 1, height: 52, paddingHorizontal: 14, fontSize: 18, color: '#111', letterSpacing: 1 },
    charCount: { fontSize: 11, color: '#bbb', textAlign: 'right', marginBottom: 24, marginRight: 4 },

    button: {
        backgroundColor: '#075E54',
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: { backgroundColor: '#b2d8d8' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    footer: { fontSize: 11, color: '#bbb', textAlign: 'center', lineHeight: 16 },
});