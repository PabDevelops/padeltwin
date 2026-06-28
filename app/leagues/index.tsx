import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useProfile } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function LeaguesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Leagues are now official rankings by city and country — everyone competes on the same board, ranked by
        PS Score. No invites needed.
      </Text>

      <Pressable style={({ pressed }) => [styles.leagueCard, pressed && { opacity: 0.9 }]} onPress={() => router.push('/leagues/city' as any)}>
        <View style={styles.leagueCardIcon}>
          <Ionicons name="business" size={20} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leagueCardName}>City League</Text>
          <Text style={styles.leagueCardSub}>{profile?.zone ? profile.zone : 'Add your city in your profile'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.leagueCard, pressed && { opacity: 0.9 }]} onPress={() => router.push('/leagues/country' as any)}>
        <View style={[styles.leagueCardIcon, { backgroundColor: 'rgba(125, 57, 235, 0.12)' }]}>
          <Ionicons name="globe" size={20} color={theme.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leagueCardName}>Country League</Text>
          <Text style={styles.leagueCardSub}>{profile?.country ? profile.country : 'Add your country in your profile'}</Text>
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
  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  leagueCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 255, 51, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueCardName: { color: theme.text, fontWeight: '800', fontSize: 15 },
  leagueCardSub: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});
