import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMatch, useJoinMatch, useLeaveMatch, useMatchResult, useRecordMatchResult } from '@/lib/queries';
import { useSession } from '@/lib/useSession';
import type { MatchPlayer, PlayerLevel, Profile, SetScore, Team } from '@/types/database';
import { theme, buttonRadius } from '@/constants/theme';
import { LEVEL_LABELS } from '@/constants/levels';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: match, isLoading } = useMatch(id);
  const { data: existingResult, isLoading: resultLoading } = useMatchResult(id);
  const joinMatch = useJoinMatch();
  const leaveMatch = useLeaveMatch();
  const recordResult = useRecordMatchResult();

  const [showResultForm, setShowResultForm] = useState(false);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [sets, setSets] = useState<SetScore[]>([{ a: 0, b: 0 }]);
  const [winner, setWinner] = useState<Team | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  if (isLoading || !match || resultLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const players: (MatchPlayer & { profiles: Profile | null })[] = match.match_players ?? [];
  const isJoined = players.some((p) => p.player_id === userId);
  const isFull = players.length >= match.max_players;
  const matchId = match.id;
  const isPast = new Date(match.date_time).getTime() < Date.now();
  const canRecordResult = isPast && players.length === 4 && !existingResult && isJoined;

  function handleJoin() {
    if (!userId) return;
    joinMatch.mutate({ matchId, playerId: userId });
  }

  function handleLeave() {
    if (!userId) return;
    leaveMatch.mutate({ matchId, playerId: userId });
  }

  function toggleTeamA(playerId: string) {
    setTeamA((current) => {
      if (current.includes(playerId)) return current.filter((p) => p !== playerId);
      if (current.length >= 2) return current;
      return [...current, playerId];
    });
  }

  function updateSet(index: number, key: 'a' | 'b', value: string) {
    setSets((current) =>
      current.map((s, i) => (i === index ? { ...s, [key]: Number(value) || 0 } : s))
    );
  }

  function addSet() {
    if (sets.length >= 5) return;
    setSets((current) => [...current, { a: 0, b: 0 }]);
  }

  function handleSubmitResult() {
    setResultError(null);
    if (teamA.length !== 2) {
      setResultError('Pick the 2 players for team A.');
      return;
    }
    if (!winner) {
      setResultError('Pick which team won.');
      return;
    }
    if (!userId) return;

    const teamBIds = players.map((p) => p.player_id).filter((pid) => !teamA.includes(pid));

    recordResult.mutate(
      {
        matchId,
        teamAPlayer1: teamA[0],
        teamAPlayer2: teamA[1],
        teamBPlayer1: teamBIds[0],
        teamBPlayer2: teamBIds[1],
        sets,
        winner,
        recordedBy: userId,
      },
      {
        onSuccess: () => setShowResultForm(false),
        onError: (err: any) => setResultError(err.message ?? 'Could not record the result'),
      }
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{match.location}</Text>
      <Text style={styles.subtitle}>{new Date(match.date_time).toLocaleString('en-GB')}</Text>

      <View style={styles.row}>
        <Text style={styles.badge}>{LEVEL_LABELS[match.level as PlayerLevel]}</Text>
        <Text style={styles.slots}>
          {players.length}/{match.max_players} players
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Players</Text>
      <FlatList
        data={players}
        keyExtractor={(p) => p.player_id}
        renderItem={({ item }) => (
          <Text style={styles.player}>• {item.profiles?.full_name ?? 'Player'}</Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No players have joined yet.</Text>}
      />

      {existingResult && (
        <>
          <Text style={styles.sectionTitle}>Result</Text>
          <Text style={styles.resultText}>
            Sets: {existingResult.sets.map((s) => `${s.a}-${s.b}`).join(', ')} — Team{' '}
            {existingResult.winner.toUpperCase()} won
          </Text>
        </>
      )}

      {match.status === 'cancelled' ? (
        <Text style={styles.cancelled}>This match has been cancelled.</Text>
      ) : isJoined ? (
        <Pressable style={[styles.button, styles.leaveButton]} onPress={handleLeave} disabled={leaveMatch.isPending}>
          {leaveMatch.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Leave match</Text>}
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, isFull && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={isFull || joinMatch.isPending}>
          {joinMatch.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isFull ? 'Match full' : 'Join'}</Text>
          )}
        </Pressable>
      )}

      {canRecordResult && !showResultForm && (
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setShowResultForm(true)}>
          <Text style={styles.buttonText}>Record result</Text>
        </Pressable>
      )}

      {showResultForm && (
        <View style={styles.resultForm}>
          <Text style={styles.sectionTitle}>Team A (pick 2)</Text>
          <View style={styles.chipRow}>
            {players.map((p) => (
              <Pressable
                key={p.player_id}
                style={[styles.playerChip, teamA.includes(p.player_id) && styles.playerChipActive]}
                onPress={() => toggleTeamA(p.player_id)}>
                <Text
                  style={[
                    styles.playerChipText,
                    teamA.includes(p.player_id) && styles.playerChipTextActive,
                  ]}>
                  {p.profiles?.full_name ?? 'Player'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Sets</Text>
          {sets.map((s, i) => (
            <View key={i} style={styles.setRow}>
              <TextInput
                style={styles.setInput}
                keyboardType="number-pad"
                value={String(s.a)}
                onChangeText={(v) => updateSet(i, 'a', v)}
              />
              <Text style={styles.setDash}>-</Text>
              <TextInput
                style={styles.setInput}
                keyboardType="number-pad"
                value={String(s.b)}
                onChangeText={(v) => updateSet(i, 'b', v)}
              />
            </View>
          ))}
          <Pressable onPress={addSet}>
            <Text style={styles.addSet}>+ Add set</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Winning team</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.playerChip, winner === 'a' && styles.playerChipActive]}
              onPress={() => setWinner('a')}>
              <Text style={[styles.playerChipText, winner === 'a' && styles.playerChipTextActive]}>
                Team A
              </Text>
            </Pressable>
            <Pressable
              style={[styles.playerChip, winner === 'b' && styles.playerChipActive]}
              onPress={() => setWinner('b')}>
              <Text style={[styles.playerChipText, winner === 'b' && styles.playerChipTextActive]}>
                Team B
              </Text>
            </Pressable>
          </View>

          {resultError && <Text style={styles.error}>{resultError}</Text>}

          <Pressable style={styles.button} onPress={handleSubmitResult} disabled={recordResult.isPending}>
            {recordResult.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save result</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  scrollContainer: { flex: 1, backgroundColor: theme.background },
  container: { padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.text },
  subtitle: { color: theme.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  badge: { backgroundColor: theme.accent, color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12 },
  slots: { fontWeight: '600', color: theme.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 8, color: theme.text },
  player: { fontSize: 16, paddingVertical: 4, color: theme.text },
  empty: { color: theme.textMuted },
  resultText: { color: theme.text, fontSize: 15 },
  button: { backgroundColor: theme.primary, borderRadius: buttonRadius, padding: 14, alignItems: 'center', marginTop: 24 },
  secondaryButton: { backgroundColor: theme.accent },
  leaveButton: { backgroundColor: theme.danger },
  buttonDisabled: { backgroundColor: theme.textMuted },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelled: { color: theme.danger, marginTop: 24, textAlign: 'center' },
  resultForm: { marginTop: 8 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  playerChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.card },
  playerChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  playerChipText: { color: theme.text, fontWeight: '600' },
  playerChipTextActive: { color: '#fff' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  setInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 8, width: 60, textAlign: 'center', backgroundColor: theme.card, color: theme.text },
  setDash: { fontSize: 16, color: theme.text },
  addSet: { color: theme.accent, fontWeight: '600', marginTop: 8 },
  error: { color: theme.danger, marginTop: 12 },
});
