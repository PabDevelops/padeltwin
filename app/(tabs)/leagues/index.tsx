import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useProfile, useMyPairs, useMyKopStatus } from '@/lib/queries';
import { divisionFromPairElo } from '@/lib/pairDivisions';
import { theme, cardRadius, chipRadius } from '@/constants/theme';
import { Card } from '@/components/Card';

export default function LeaguesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: pairs, isLoading: pairsLoading } = useMyPairs(userId);
  const activePair = pairs && pairs.length > 0 ? [...pairs].sort((a, b) => b.elo - a.elo)[0] : null;
  const { data: kopStatus } = useMyKopStatus(userId);

  if (pairsLoading) return null;

  if (!activePair) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={{ padding: 24, alignSelf: 'center', width: '100%' }} contentStyle={{ alignItems: 'center' }}>
          <Ionicons name="people-outline" size={36} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>Leagues are for ranked pairs</Text>
          <Text style={styles.emptyText}>
            Padel is a 2-person sport — declare a fixed pair with an accepted partner. Your pair is automatically
            ranked in your country's league, no joining required.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/pairs' as any)}>
            <Text style={styles.emptyBtnText}>DECLARE A PAIR</Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Your pair is automatically ranked in the league of your country — no need to join. Want to compete in
        another country's league too? Declare another pair there (up to your pair limit).
      </Text>

      <Card style={styles.pairBanner} contentStyle={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pairBannerText}>
            Playing as: {activePair.player_a?.full_name ?? 'You'} & {activePair.player_b?.full_name ?? 'Partner'}
          </Text>
          <Text style={styles.pairBannerDivision}>{divisionFromPairElo(activePair.elo)}</Text>
        </View>
        <Text style={styles.pairBannerElo}>{activePair.elo} PS</Text>
      </Card>

      <Card style={styles.card}>
        <Pressable
          style={({ pressed }) => [
            { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => router.push(`/leagues/country?value=${encodeURIComponent(profile?.country ?? '')}` as any)}
        >
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Ionicons name="globe" size={20} color={theme.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{profile?.country ?? 'Set your country'} League</Text>
            <Text style={styles.cardSub}>{!profile?.country ? 'Add your country in your profile' : 'View the full ranking'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      </Card>

      <Card style={styles.card}>
        <Pressable
          style={({ pressed }) => [
            { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => router.push('/club-leaderboard' as any)}
        >
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(0, 230, 118, 0.12)' }]}>
            <Ionicons name="flame" size={20} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>My Feuds & KOP Status</Text>
            <Text style={styles.cardSub}>
              {kopStatus
                ? kopStatus.crownedClubs.length > 0
                  ? `Holding ${kopStatus.crownedClubs.length} KOP Crown${kopStatus.crownedClubs.length === 1 ? '' : 's'}`
                  : kopStatus.joinedClubs.length > 0
                    ? 'Contesting, no crown yet'
                    : 'Join a club to contest the throne'
                : 'Join a club to contest the throne'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 12, paddingBottom: 110 },
  intro: { color: theme.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  pairBanner: {
    backgroundColor: 'rgba(198, 255, 51, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(198, 255, 51, 0.15)',
    borderRadius: chipRadius,
    marginBottom: 4,
  },
  pairBannerText: { color: theme.text, fontSize: 12, fontWeight: '700' },
  pairBannerDivision: { color: theme.accent, fontSize: 10, fontWeight: '900', marginTop: 2, letterSpacing: 0.5 },
  pairBannerElo: { color: theme.accent, fontWeight: '900', fontSize: 13 },
  card: {
    borderRadius: cardRadius,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 255, 51, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: theme.text,  fontSize: 14 , textTransform: 'uppercase'},
  cardSub: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  emptyContainer: { flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { color: theme.text, fontWeight: '900', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  emptyText: { color: theme.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  emptyBtn: { backgroundColor: theme.accent, borderRadius: chipRadius, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText: { color: theme.onAccent, fontWeight: '900', fontSize: 13 },
});
