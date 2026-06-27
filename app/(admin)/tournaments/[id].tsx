import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useAdminAddTournamentParticipant,
  useAdminGenerateBracket,
  useAdminRecordTournamentResult,
  useAdminRemoveTournamentParticipant,
  useAdminSearchProfiles,
  useAdminTournamentMatches,
  useAdminTournamentParticipants,
  useAdminTournaments,
} from '@/lib/queries';
import { theme, cardRadius, buttonRadius } from '@/constants/theme';
import type { SetScore, TournamentMatch } from '@/types/database';

function entrantName(participants: ReturnType<typeof useAdminTournamentParticipants>['data'], entrantId: string | null) {
  if (!entrantId || !participants) return 'TBD';
  const p = participants.find((x) => x.id === entrantId);
  if (!p) return 'TBD';
  const a = p.profile?.full_name ?? 'Player';
  return p.partner ? `${a} / ${p.partner.full_name ?? 'Partner'}` : a;
}

function MatchRow({
  match,
  participants,
  onRecord,
}: {
  match: TournamentMatch;
  participants: ReturnType<typeof useAdminTournamentParticipants>['data'];
  onRecord: (matchId: string, sets: SetScore[], winnerEntrantId: string) => void;
}) {
  const [sets, setSets] = useState<SetScore[]>([{ a: 0, b: 0 }]);

  if (match.status === 'bye') {
    return (
      <View style={styles.matchRow}>
        <Text style={styles.matchText}>{entrantName(participants, match.entrant_a_id)} advances (bye)</Text>
      </View>
    );
  }

  if (match.status === 'completed') {
    return (
      <View style={styles.matchRow}>
        <Text style={styles.matchText}>
          {entrantName(participants, match.entrant_a_id)} vs {entrantName(participants, match.entrant_b_id)}
        </Text>
        <Text style={styles.winnerText}>
          Winner: {entrantName(participants, match.winner_entrant_id)} ({(match.sets ?? []).map((s) => `${s.a}-${s.b}`).join(', ')})
        </Text>
      </View>
    );
  }

  if (!match.entrant_a_id || !match.entrant_b_id) {
    return (
      <View style={styles.matchRow}>
        <Text style={styles.matchTextMuted}>Waiting for previous round…</Text>
      </View>
    );
  }

  return (
    <View style={styles.matchRow}>
      <Text style={styles.matchText}>
        {entrantName(participants, match.entrant_a_id)} vs {entrantName(participants, match.entrant_b_id)}
      </Text>
      {sets.map((s, i) => (
        <View key={i} style={styles.setRow}>
          <TextInput
            style={styles.setInput}
            keyboardType="numeric"
            value={String(s.a)}
            onChangeText={(v) => setSets((prev) => prev.map((p, idx) => (idx === i ? { ...p, a: Number(v) || 0 } : p)))}
          />
          <Text style={styles.setDash}>-</Text>
          <TextInput
            style={styles.setInput}
            keyboardType="numeric"
            value={String(s.b)}
            onChangeText={(v) => setSets((prev) => prev.map((p, idx) => (idx === i ? { ...p, b: Number(v) || 0 } : p)))}
          />
        </View>
      ))}
      <Pressable onPress={() => setSets((prev) => [...prev, { a: 0, b: 0 }])}>
        <Text style={styles.addSetText}>+ ADD SET</Text>
      </Pressable>
      <View style={styles.winnerActions}>
        <Pressable style={styles.winnerBtn} onPress={() => onRecord(match.id, sets, match.entrant_a_id!)}>
          <Text style={styles.winnerBtnText}>{entrantName(participants, match.entrant_a_id)} WINS</Text>
        </Pressable>
        <Pressable style={styles.winnerBtn} onPress={() => onRecord(match.id, sets, match.entrant_b_id!)}>
          <Text style={styles.winnerBtnText}>{entrantName(participants, match.entrant_b_id)} WINS</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminTournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tournaments } = useAdminTournaments();
  const tournament = tournaments?.find((t) => t.id === id);
  const { data: participants, isLoading: participantsLoading } = useAdminTournamentParticipants(id);
  const { data: matches } = useAdminTournamentMatches(id);

  const addParticipant = useAdminAddTournamentParticipant();
  const removeParticipant = useAdminRemoveTournamentParticipant();
  const generate = useAdminGenerateBracket();
  const recordResult = useAdminRecordTournamentResult();

  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useAdminSearchProfiles(searchQuery);

  if (!tournament) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  const rounds = Array.from(new Set((matches ?? []).map((m) => m.round))).sort((a, b) => a - b);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View>
        <Text style={styles.title}>{tournament.name}</Text>
        <Text style={styles.subtitle}>
          {tournament.format === 'bracket' ? 'Bracket' : 'Round robin'} · {tournament.status}
        </Text>
      </View>

      {tournament.status === 'draft' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTICIPANTS ({participants?.length ?? 0})</Text>

          <TextInput
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search player to add…"
            placeholderTextColor={theme.textMuted}
          />
          {searchResults && searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.searchResultRow}
                  onPress={() => {
                    addParticipant.mutate({ tournamentId: id, profileId: p.id });
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.searchResultText}>{p.full_name ?? 'Player'}</Text>
                  <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
                </Pressable>
              ))}
            </View>
          )}

          {participantsLoading && <ActivityIndicator color={theme.accent} />}
          {(participants ?? []).map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <Text style={styles.participantText}>
                {p.profile?.full_name ?? 'Player'}
                {p.partner ? ` / ${p.partner.full_name ?? 'Partner'}` : ''}
              </Text>
              <Pressable onPress={() => removeParticipant.mutate(p.id)}>
                <Ionicons name="close-circle-outline" size={18} color={theme.danger} />
              </Pressable>
            </View>
          ))}

          <Pressable
            style={[styles.generateBtn, (!participants || participants.length < 2) && { opacity: 0.5 }]}
            disabled={!participants || participants.length < 2}
            onPress={() => generate.mutate({ tournamentId: id, format: tournament.format })}
          >
            <Text style={styles.generateBtnText}>GENERATE MATCHES</Text>
          </Pressable>
        </View>
      )}

      {tournament.status !== 'draft' && (
        <View style={{ gap: 16 }}>
          {rounds.map((round) => (
            <View key={round} style={styles.section}>
              <Text style={styles.sectionTitle}>ROUND {round}</Text>
              {(matches ?? [])
                .filter((m) => m.round === round)
                .map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    participants={participants}
                    onRecord={(matchId, sets, winnerEntrantId) => {
                      Alert.alert('Confirm result?', undefined, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm', onPress: () => recordResult.mutate({ matchId, sets, winnerEntrantId }) },
                      ]);
                    }}
                  />
                ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: theme.textMuted, fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  section: { backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 10 },
  sectionTitle: { color: theme.accent, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  input: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.text },
  searchResults: { gap: 4 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  searchResultText: { color: theme.text, fontSize: 13 },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  participantText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  generateBtn: { backgroundColor: theme.accent, borderRadius: buttonRadius, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  generateBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  matchRow: { backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 8 },
  matchText: { color: theme.text, fontWeight: '700', fontSize: 13 },
  matchTextMuted: { color: theme.textMuted, fontSize: 13 },
  winnerText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setInput: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: theme.text, width: 50, textAlign: 'center' },
  setDash: { color: theme.textMuted },
  addSetText: { color: theme.accent, fontWeight: '700', fontSize: 11 },
  winnerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  winnerBtn: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.accent, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  winnerBtnText: { color: theme.accent, fontWeight: '800', fontSize: 10, letterSpacing: 0.3 },
});
