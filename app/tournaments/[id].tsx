import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/lib/useSession';
import { useTournament, useTournamentMatches, useTournamentParticipants } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';
import type { TournamentMatch, TournamentParticipantWithProfiles } from '@/types/database';

function entrantName(participants: TournamentParticipantWithProfiles[], entrantId: string | null) {
  if (!entrantId) return 'TBD';
  const p = participants.find((x) => x.id === entrantId);
  if (!p) return 'TBD';
  const a = p.profile?.full_name ?? 'Player';
  return p.partner ? `${a} / ${p.partner.full_name ?? 'Partner'}` : a;
}

function MatchRow({
  match,
  participants,
  myEntrantId,
}: {
  match: TournamentMatch;
  participants: TournamentParticipantWithProfiles[];
  myEntrantId: string | null;
}) {
  const involvesMe = myEntrantId && (match.entrant_a_id === myEntrantId || match.entrant_b_id === myEntrantId);

  if (match.status === 'bye') {
    return <Text style={styles.byeText}>{entrantName(participants, match.entrant_a_id)} advanced (bye)</Text>;
  }

  return (
    <View style={[styles.matchRow, involvesMe && styles.matchRowMine]}>
      <Text style={[styles.matchText, match.winner_entrant_id === match.entrant_a_id && styles.matchTextWinner]}>
        {entrantName(participants, match.entrant_a_id)}
      </Text>
      <Text style={styles.matchVs}>
        {match.status === 'completed' ? (match.sets ?? []).map((s) => `${s.a}-${s.b}`).join(', ') : 'vs'}
      </Text>
      <Text style={[styles.matchText, match.winner_entrant_id === match.entrant_b_id && styles.matchTextWinner]}>
        {entrantName(participants, match.entrant_b_id)}
      </Text>
    </View>
  );
}

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { data: tournament } = useTournament(id);
  const { data: participants } = useTournamentParticipants(id);
  const { data: matches, isLoading } = useTournamentMatches(id);

  if (!tournament || isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  const myParticipant = participants?.find((p) => p.profile_id === session?.user.id || p.partner_id === session?.user.id);
  const myEntrantId = myParticipant?.id ?? null;

  const rounds = Array.from(new Set((matches ?? []).map((m) => m.round))).sort((a, b) => a - b);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View>
        <Text style={styles.title}>{tournament.name}</Text>
        <Text style={styles.subtitle}>
          {tournament.format === 'bracket' ? 'Knockout bracket' : 'Round robin'} · {tournament.status === 'completed' ? 'Completed' : 'In progress'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PLAYERS ({participants?.length ?? 0})</Text>
        {(participants ?? []).map((p) => (
          <Text key={p.id} style={[styles.participantText, p.id === myEntrantId && styles.participantTextMine]}>
            {entrantName(participants ?? [], p.id)}
          </Text>
        ))}
      </View>

      {rounds.map((round) => (
        <View key={round} style={styles.section}>
          <Text style={styles.sectionTitle}>{tournament.format === 'bracket' ? `ROUND ${round}` : 'MATCHES'}</Text>
          {(matches ?? [])
            .filter((m) => m.round === round)
            .map((m) => (
              <MatchRow key={m.id} match={m} participants={participants ?? []} myEntrantId={myEntrantId} />
            ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  title: { color: theme.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: theme.textMuted, fontSize: 13, marginTop: 4 },
  section: { backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8 },
  sectionTitle: { color: theme.accent, fontWeight: '900', fontSize: 12, letterSpacing: 0.5, marginBottom: 4 },
  participantText: { color: theme.text, fontSize: 13 },
  participantTextMine: { color: theme.accent, fontWeight: '800' },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 8,
  },
  matchRowMine: { borderColor: theme.accent },
  matchText: { flex: 1, color: theme.textMuted, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  matchTextWinner: { color: theme.text },
  matchVs: { color: theme.textMuted, fontSize: 11, fontWeight: '800' },
  byeText: { color: theme.textMuted, fontSize: 13, fontStyle: 'italic' },
});
