import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '@/lib/useSession';
import { usePairLeagueBoard, useProfile, useMyPairs } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';
import { ProBadge } from '@/components/ProBadge';
import { CoachBadge } from '@/components/CoachBadge';
import { BackHeader } from '@/components/BackHeader';

export default function CityLeagueScreen() {
  const { value } = useLocalSearchParams<{ value?: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const cityValue = value ?? profile?.zone ?? undefined;
  const { data: pairs, isLoading } = usePairLeagueBoard('city', cityValue);
  const { data: myPairs } = useMyPairs(userId);
  const myPairIds = new Set((myPairs ?? []).map((p) => p.id));

  if (!cityValue) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <BackHeader title="City League" />
        <View style={styles.center}>
          <Text style={styles.emptyText}>Add your city in your profile to see your local ranking.</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <BackHeader title="City League" />
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 8 }}>
      <BackHeader title="City League" />
      <Text style={styles.title}>{cityValue.toUpperCase()} LEAGUE</Text>
      <Text style={styles.subtitle}>Ranked pairs by PS Score across this city.</Text>

      <View style={styles.leaderboardContainer}>
        {(pairs ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No pairs have joined this league yet.</Text>
        ) : (
          (pairs ?? []).map((pair, index) => {
            const rank = index + 1;
            const isMine = myPairIds.has(pair.id);
            return (
              <View key={pair.id} style={[styles.row, isMine && styles.rowMe]}>
                <Text style={[styles.rankText, rank <= 3 && styles.rankTextTop]}>{rank}</Text>
                <Text style={styles.pairName} numberOfLines={1}>
                  {(pair.player_a?.full_name ?? 'Player').toUpperCase()} & {(pair.player_b?.full_name ?? 'Player').toUpperCase()}
                  {isMine ? ' (YOU)' : ''}
                </Text>
                {pair.player_a?.is_pro || pair.player_b?.is_pro ? <ProBadge size="sm" /> : null}
                {pair.player_a?.coach_status === 'approved' || pair.player_b?.coach_status === 'approved' ? <CoachBadge size="sm" /> : null}
                <Text style={styles.pairElo}>{pair.elo}</Text>
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
  pairName: { flex: 1, color: theme.text, fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
  pairElo: { color: theme.text, fontWeight: '900', fontSize: 13 },
  emptyText: { color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: 16, lineHeight: 18 },
});
