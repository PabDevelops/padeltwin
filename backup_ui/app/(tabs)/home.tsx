import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/lib/useSession';
import { useProfile, useMyStats, useRecentResults, useLeaderboard } from '@/lib/queries';
import type { MatchResultWithProfiles } from '@/types/database';
import { theme, cardRadius } from '@/constants/theme';

function didWin(result: MatchResultWithProfiles, userId: string) {
  const inTeamA = result.team_a_player1 === userId || result.team_a_player2 === userId;
  return (inTeamA && result.winner === 'a') || (!inTeamA && result.winner === 'b');
}

function opponents(result: MatchResultWithProfiles, userId: string) {
  const inTeamA = result.team_a_player1 === userId || result.team_a_player2 === userId;
  const rivals = inTeamA
    ? [result.team_b_player1_profile, result.team_b_player2_profile]
    : [result.team_a_player1_profile, result.team_a_player2_profile];
  return rivals.map((p) => p?.full_name ?? 'Player').join(' / ');
}

export default function HomeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: stats, isLoading: statsLoading } = useMyStats(userId);
  const { data: recentResults, isLoading: resultsLoading } = useRecentResults(userId, 5);
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(profile?.zone);

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Hi{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>

      <View style={styles.statsCard}>
        {statsLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.elo ?? '—'}</Text>
              <Text style={styles.statLabel}>ELO</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.played ?? 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.winRate ?? 0}%</Text>
              <Text style={styles.statLabel}>Win rate</Text>
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Recent matches</Text>
      {resultsLoading ? (
        <ActivityIndicator />
      ) : recentResults && recentResults.length > 0 ? (
        recentResults.map((r) => (
          <View key={r.id} style={styles.resultCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultOpponent}>vs {opponents(r, userId!)}</Text>
              <Text style={[styles.resultBadge, didWin(r, userId!) ? styles.win : styles.loss]}>
                {didWin(r, userId!) ? 'Win' : 'Loss'}
              </Text>
            </View>
            <Text style={styles.resultSets}>{r.sets.map((s) => `${s.a}-${s.b}`).join('  ')}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>You haven&apos;t played any matches with a recorded result yet.</Text>
      )}

      <Text style={styles.sectionTitle}>Top players {profile?.zone ? `in ${profile.zone}` : ''}</Text>
      {leaderboardLoading ? (
        <ActivityIndicator />
      ) : (
        leaderboard?.map((p, index) => (
          <View key={p.id} style={styles.leaderboardRow}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.leaderboardName}>{p.full_name ?? 'Player'}</Text>
            <Text style={styles.leaderboardElo}>{p.elo}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: theme.background },
  container: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    paddingVertical: 20,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  statLabel: { color: theme.textMuted, marginTop: 4, fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 8, color: theme.text },
  resultCard: { backgroundColor: theme.card, borderRadius: cardRadius, padding: 14, marginBottom: 8 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultOpponent: { fontWeight: '600', color: theme.text },
  resultBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  win: { backgroundColor: theme.accent, color: '#fff' },
  loss: { backgroundColor: theme.border, color: theme.textMuted },
  resultSets: { color: theme.textMuted, marginTop: 6, fontSize: 13 },
  empty: { color: theme.textMuted },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rank: { width: 28, fontWeight: '700', color: theme.accent },
  leaderboardName: { flex: 1, color: theme.text, fontWeight: '600' },
  leaderboardElo: { color: theme.textMuted, fontWeight: '600' },
});
