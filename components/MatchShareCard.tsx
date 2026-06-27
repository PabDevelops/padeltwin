import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { MatchResultWithProfiles } from '@/types/database';

function teamName(p1: { full_name: string | null } | null, p2: { full_name: string | null } | null) {
  return `${p1?.full_name ?? 'Player'} / ${p2?.full_name ?? 'Player'}`;
}

// Captured off-screen by react-native-view-shot into a PNG for sharing —
// kept as its own component so the visual design is independent from the
// match detail screen's layout.
export const MatchShareCard = forwardRef<View, { result: MatchResultWithProfiles }>(function MatchShareCard(
  { result },
  ref
) {
  const aWon = result.winner === 'a';

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <Text style={styles.brand}>PADELSCRIM</Text>
      <Text style={styles.subtitle}>MATCH RESULT</Text>

      <View style={styles.teamsRow}>
        <View style={[styles.teamBox, aWon && styles.teamBoxWinner]}>
          <Text style={[styles.teamName, aWon && styles.teamNameWinner]}>{teamName(result.team_a_player1_profile, result.team_a_player2_profile)}</Text>
          {aWon && <Text style={styles.winnerTag}>WINNER</Text>}
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={[styles.teamBox, !aWon && styles.teamBoxWinner]}>
          <Text style={[styles.teamName, !aWon && styles.teamNameWinner]}>{teamName(result.team_b_player1_profile, result.team_b_player2_profile)}</Text>
          {!aWon && <Text style={styles.winnerTag}>WINNER</Text>}
        </View>
      </View>

      <View style={styles.setsRow}>
        {result.sets.map((s, i) => (
          <View key={i} style={styles.setBox}>
            <Text style={[styles.setScore, aWon && styles.setScoreWinner]}>{s.a}</Text>
            <Text style={[styles.setScore, !aWon && styles.setScoreWinner]}>{s.b}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>MATCH • CONNECT • PLAY</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 360,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  brand: { color: theme.primary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  subtitle: { color: theme.textMuted, fontWeight: '700', fontSize: 11, letterSpacing: 2 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  teamBox: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  teamBoxWinner: { borderColor: theme.primary, backgroundColor: 'rgba(198,255,51,0.08)' },
  teamName: { color: theme.text, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  teamNameWinner: { color: theme.primary, fontWeight: '900' },
  winnerTag: { color: theme.primary, fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },
  vs: { color: theme.textMuted, fontWeight: '900', fontSize: 12 },
  setsRow: { flexDirection: 'row', gap: 8 },
  setBox: {
    backgroundColor: theme.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  setScore: { color: theme.textMuted, fontWeight: '800', fontSize: 16 },
  setScoreWinner: { color: theme.text },
  footer: { color: theme.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
});
