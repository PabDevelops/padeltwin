import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, cardRadius } from '@/constants/theme';

const SECTIONS: { href: any; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { href: '/(admin)/coaches', icon: 'school-outline', title: 'Coach Applications', subtitle: 'Review and approve/reject pending coaches' },
  { href: '/(admin)/reports', icon: 'flag-outline', title: 'Reports', subtitle: 'User-submitted reports awaiting review' },
  { href: '/(admin)/users', icon: 'people-outline', title: 'Accounts', subtitle: 'Search players, ban/unban, grant Pro' },
  { href: '/(admin)/moderation', icon: 'shield-outline', title: 'Content Moderation', subtitle: 'Recent posts/achievements feed' },
  { href: '/(admin)/chats', icon: 'chatbubbles-outline', title: 'Chat Moderation', subtitle: 'Search and remove messages' },
  { href: '/(admin)/tournaments', icon: 'trophy-outline', title: 'Tournaments', subtitle: 'Create and run tournaments' },
];

export default function AdminHome() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>GOD MODE</Text>
      <Text style={styles.subtitle}>Admin & moderator tools — not visible to regular players.</Text>

      {SECTIONS.map((s) => (
        <Pressable key={s.href} style={styles.row} onPress={() => router.push(s.href)}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={20} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{s.title}</Text>
            <Text style={styles.rowSubtitle}>{s.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 12 },
  title: { color: theme.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { color: theme.textMuted, fontSize: 13, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: theme.text, fontWeight: '800', fontSize: 14 },
  rowSubtitle: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});
