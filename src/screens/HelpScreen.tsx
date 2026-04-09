import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ARTICLES: HelpArticle[] = [
  {
    id: '1',
    title: 'Managing Contacts',
    icon: 'people-outline',
    content: 'Talkenly automatically matches your phone contacts with users who have already registered. You can recognize them by the "Contacts on Talkenly" section. If a contact has multiple numbers, we check each one to ensure you stay connected.',
  },
  {
    id: '2',
    title: 'Inviting Friends',
    icon: 'mail-outline',
    content: 'If someone you know isn\'t on Talkenly yet, you can send them a direct SMS invite or share a download link using any messaging app on your phone. Just look for the "Invite" button or use the menu to "Invite a friend".',
  },
  {
    id: '3',
    title: 'Privacy & Security',
    icon: 'shield-checkmark-outline',
    content: 'Your privacy is our priority. We only use your phone number for identification and contact matching. Your chat history and profile information are stored securely, and we never share your contact book with third parties.',
  },
  {
    id: '4',
    title: 'Refreshing the List',
    icon: 'refresh-outline',
    content: 'If you just added a new contact and they don\'t appear in the "Registered" section, use the "Refresh" option in the top menu. This will force a new sync with your phone book and Firestore to pick up late registrations.',
  },
];

export default function HelpScreen() {
  const navigation = useNavigation();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const colors = {
    background: isDark ? '#111B21' : '#F0F2F5',
    header: isDark ? '#1F2C34' : '#008080',
    card: isDark ? '#233138' : '#FFFFFF',
    textPrimary: isDark ? '#E9EDEF' : '#111111',
    textSecondary: isDark ? '#8696A0' : '#667781',
    icon: isDark ? '#00A884' : '#008080',
    accent: '#008080',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.header }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={[styles.content, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>How can we help you?</Text>
          <Text style={[styles.introSub, { color: colors.textSecondary }]}>
            Browse our articles below to learn more about Talkenly features and privacy.
          </Text>
        </View>

        {ARTICLES.map((article) => (
          <View key={article.id} style={[styles.articleCard, { backgroundColor: colors.card }]}>
            <View style={styles.articleHeader}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#202C33' : '#F0F2F5' }]}>
                <Ionicons name={article.icon} size={22} color={colors.icon} />
              </View>
              <Text style={[styles.articleTitle, { color: colors.textPrimary }]}>{article.title}</Text>
            </View>
            <Text style={[styles.articleContent, { color: colors.textSecondary }]}>
              {article.content}
            </Text>
          </View>
        ))}

        <TouchableOpacity style={styles.supportBtn}>
          <Text style={[styles.supportText, { color: colors.accent }]}>Visit our Help Center website</Text>
          <Ionicons name="open-outline" size={16} color={colors.accent} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  intro: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  introSub: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  articleCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  articleContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  supportText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
});
