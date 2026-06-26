import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateMatch, usePartnerRequests } from '@/lib/queries';
import { useSession } from '@/lib/useSession';
import type { MatchMode, MatchVisibility, PartnerRequestWithProfiles, PlayerLevel } from '@/types/database';
import { theme, buttonRadius, chipRadius } from '@/constants/theme';
import { LEVELS, LEVEL_LABELS } from '@/constants/levels';

export default function CreateMatchScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const createMatch = useCreateMatch();
  const { data: requests } = usePartnerRequests(userId);

  const partners = (requests ?? [])
    .filter((r): r is PartnerRequestWithProfiles => r.status === 'accepted')
    .map((r) => (r.from_id === userId ? r.to_profile : r.from_profile))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [level, setLevel] = useState<PlayerLevel>('intermedio');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [mode, setMode] = useState<MatchMode>('individual');
  const [visibility, setVisibility] = useState<MatchVisibility>('open');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    if (!userId) return;

    const dateTime = new Date(`${date}T${time}:00`);
    if (!location || isNaN(dateTime.getTime())) {
      setError('Check the location, date (YYYY-MM-DD) and time (HH:MM).');
      return;
    }
    if (mode === 'pair' && !partnerId) {
      setError('Pick your partner for a pair match.');
      return;
    }

    createMatch.mutate(
      {
        created_by: userId,
        location,
        date_time: dateTime.toISOString(),
        level,
        max_players: Number(maxPlayers) || 4,
        mode,
        visibility,
        partnerId: mode === 'pair' ? partnerId! : undefined,
      },
      {
        onSuccess: (match) => {
          setLocation('');
          setDate('');
          setTime('');
          router.push(`/match/${match.id}`);
        },
        onError: (err: any) => setError(err.message ?? 'Could not create the match'),
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create match</Text>

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Club / Court"
        placeholderTextColor={theme.textMuted}
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2026-07-01"
        placeholderTextColor={theme.textMuted}
        value={date}
        onChangeText={setDate}
      />

      <Text style={styles.label}>Time (HH:MM)</Text>
      <TextInput
        style={styles.input}
        placeholder="19:30"
        placeholderTextColor={theme.textMuted}
        value={time}
        onChangeText={setTime}
      />

      <Text style={styles.label}>Required level</Text>
      <View style={styles.row}>
        {LEVELS.map((l) => (
          <Pressable
            key={l}
            style={[styles.chip, level === l && styles.chipActive]}
            onPress={() => setLevel(l)}>
            <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{LEVEL_LABELS[l]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Number of players</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={maxPlayers}
        onChangeText={setMaxPlayers}
      />

      <Text style={styles.label}>Mode</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, mode === 'individual' && styles.chipActive]}
          onPress={() => setMode('individual')}>
          <Text style={[styles.chipText, mode === 'individual' && styles.chipTextActive]}>Individual</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, mode === 'pair' && styles.chipActive]}
          onPress={() => setMode('pair')}>
          <Text style={[styles.chipText, mode === 'pair' && styles.chipTextActive]}>Pair</Text>
        </Pressable>
      </View>

      {mode === 'pair' && (
        <>
          <Text style={styles.label}>Your partner</Text>
          {partners.length === 0 ? (
            <Text style={styles.helperText}>
              You don&apos;t have any connected partners yet — connect with someone in the Partners tab
              first.
            </Text>
          ) : (
            <View style={styles.row}>
              {partners.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.chip, partnerId === p.id && styles.chipActive]}
                  onPress={() => setPartnerId(p.id)}>
                  <Text style={[styles.chipText, partnerId === p.id && styles.chipTextActive]}>
                    {p.full_name ?? 'Player'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      <Text style={styles.label}>Visibility</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, visibility === 'open' && styles.chipActive]}
          onPress={() => setVisibility('open')}>
          <Text style={[styles.chipText, visibility === 'open' && styles.chipTextActive]}>Open</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, visibility === 'closed' && styles.chipActive]}
          onPress={() => setVisibility('closed')}>
          <Text style={[styles.chipText, visibility === 'closed' && styles.chipTextActive]}>Closed</Text>
        </Pressable>
      </View>
      <Text style={styles.helperText}>
        {visibility === 'open'
          ? 'Anyone with a compatible level can find and join this match.'
          : 'Private match — only people you invite can join.'}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleCreate} disabled={createMatch.isPending}>
        {createMatch.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create match</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 4, backgroundColor: theme.background },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: theme.text },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, color: theme.text },
  helperText: { color: theme.textMuted, fontSize: 13, marginTop: 4 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: theme.card, color: theme.text },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: chipRadius, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.card },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: theme.primary, borderRadius: buttonRadius, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: theme.danger, marginTop: 8 },
});
