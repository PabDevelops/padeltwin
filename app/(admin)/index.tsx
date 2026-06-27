import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminDashboardStats } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

const SECTIONS: { href: any; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { href: '/(admin)/coaches', icon: 'school-outline', title: 'Coach Applications', subtitle: 'Review and approve/reject pending coaches' },
  { href: '/(admin)/reports', icon: 'flag-outline', title: 'Reports', subtitle: 'User-submitted reports awaiting review' },
  { href: '/(admin)/users', icon: 'people-outline', title: 'Accounts', subtitle: 'Search players, ban/unban, grant Pro' },
  { href: '/(admin)/moderation', icon: 'shield-outline', title: 'Content Moderation', subtitle: 'Recent posts/achievements feed' },
  { href: '/(admin)/chats', icon: 'chatbubbles-outline', title: 'Chat Moderation', subtitle: 'Search and remove messages' },
  { href: '/(admin)/tournaments', icon: 'trophy-outline', title: 'Tournaments', subtitle: 'Create and run tournaments' },
  { href: '/(admin)/leagues', icon: 'list-outline', title: 'Leagues', subtitle: 'Oversee private leagues' },
  { href: '/(admin)/collusion', icon: 'warning-outline', title: 'Collusion Watch', subtitle: 'Flagged ELO manipulation candidates' },
  { href: '/(admin)/broadcast', icon: 'megaphone-outline', title: 'Broadcast', subtitle: 'Send a push notification to a segment' },
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminHome() {
  const router = useRouter();
  const { data: stats, isLoading } = useAdminDashboardStats();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>GOD MODE</Text>
      <Text style={styles.subtitle}>Admin & moderator tools — not visible to regular players.</Text>

      {isLoading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="PLAYERS" value={stats?.total_players ?? 0} />
          <StatCard label="CONFIRMED MATCHES" value={stats?.total_confirmed_matches ?? 0} />
          <StatCard label="AVG ELO" value={stats?.average_elo ?? '—'} />
          <StatCard label="SIGNUPS (7D)" value={stats?.signups_last_7_days ?? 0} />
          <StatCard label="PENDING COACHES" value={stats?.pending_coach_applications ?? 0} />
          <StatCard label="OPEN REPORTS" value={stats?.open_reports ?? 0} />
        </View>
      )}

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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: {
    flexBasis: '31%',
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: theme.accent, fontWeight: '900', fontSize: 18 },
  statLabel: { color: theme.textMuted, fontSize: 9, fontWeight: '700', marginTop: 4, textAlign: 'center', letterSpacing: 0.3 },
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
