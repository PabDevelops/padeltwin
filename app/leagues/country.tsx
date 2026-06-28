import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/lib/useSession';
import { useCountryLeague, useProfile } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';
import { ProBadge } from '@/components/ProBadge';
import { CoachBadge } from '@/components/CoachBadge';

export default function CountryLeagueScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: players, isLoading } = useCountryLeague(profile?.country);

  if (!profile?.country) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Add your country in your profile to see your national ranking.
        </Text>
      </View>
    );
  }

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 8 }}>
      <Text style={styles.title}>{profile.country.toUpperCase()} LEAGUE</Text>
      <Text style={styles.subtitle}>Ranked by PS Score across the whole country.</Text>

      <View style={styles.leaderboardContainer}>
        {(players ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No ranked players in your country yet.</Text>
        ) : (
          (players ?? []).map((p, index) => {
            const rank = index + 1;
            const isMe = p.id === userId;
            return (
              <View key={p.id} style={[styles.row, isMe && styles.rowMe]}>
                <Text style={[styles.rankText, rank <= 3 && styles.rankTextTop]}>{rank}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {(p.full_name ?? 'Player').toUpperCase()} {isMe ? '(YOU)' : ''}
                </Text>
                {p.is_pro && <ProBadge size="sm" />}
                {p.coach_status === 'approved' && <CoachBadge size="sm" />}
                <Text style={styles.playerElo}>{p.elo}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: theme.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: theme.textMuted, fontSize: 13, marginBottom: 8 },
  leaderboardContainer: {
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowMe: { backgroundColor: 'rgba(198, 255, 51, 0.08)' },
  rankText: { width: 24, color: theme.textMuted, fontWeight: '800', fontSize: 13 },
  rankTextTop: { color: theme.accent },
  playerName: { flex: 1, color: theme.text, fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
  playerElo: { color: theme.text, fontWeight: '900', fontSize: 13 },
  emptyText: { color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: 16, lineHeight: 18 },
});
