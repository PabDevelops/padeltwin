import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useCityLeague, useKopThrones, useProfile } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function LeaguesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: cityPlayers } = useCityLeague(profile?.zone);
  const { data: thrones } = useKopThrones(profile?.country, userId);

  const myRank = cityPlayers ? cityPlayers.findIndex((p) => p.id === userId) + 1 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Your competitive standing, all in one place — ranked by PS Score, no invites needed.
      </Text>

      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={() => router.push('/leagues/city' as any)}>
        <View style={styles.cardIcon}>
          <Ionicons name="person" size={20} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>SoloQueue — {profile?.zone ?? 'Set your city'}</Text>
          <Text style={styles.cardSub}>
            {profile?.zone
              ? myRank > 0
                ? `You're rank #${myRank} of ${cityPlayers?.length ?? 0}`
                : 'Play 5 ranked matches to appear on the board'
              : 'Add your city in your profile to join'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={() => router.push('/club-leaderboard' as any)}>
        <View style={[styles.cardIcon, { backgroundColor: 'rgba(0, 230, 118, 0.12)' }]}>
          <Ionicons name="flame" size={20} color={theme.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>My Feuds & KOP Status</Text>
          <Text style={styles.cardSub}>
            {profile?.country
              ? thrones
                ? thrones.crownedClubs.length > 0
                  ? `Holding ${thrones.crownedClubs.length} KOP Crown${thrones.crownedClubs.length === 1 ? '' : 's'} in ${profile.country}`
                  : `0 crowns yet — ${thrones.totalClubs} clubs up for grabs in ${profile.country}`
                : 'No ranked clubs yet'
              : 'Add your country in your profile to track your crowns'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={() => router.push('/leagues/country' as any)}>
        <View style={[styles.cardIcon, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <Ionicons name="globe" size={20} color={theme.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>National Ranking — {profile?.country ?? 'Set your country'}</Text>
          <Text style={styles.cardSub}>See how you stack up nationally</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 12 },
  intro: { color: theme.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 255, 51, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: theme.text, fontWeight: '800', fontSize: 14 },
  cardSub: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});
