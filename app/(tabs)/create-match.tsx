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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
      <View style={styles.headerContainer}>
        <Text style={styles.tagline}>HOST A MATCH</Text>
        <Text style={styles.title}>Create match</Text>
        <Text style={styles.subtitle}>Set up a match for other compatible athletes to join</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>COURT LOGISTICS</Text>

        <Text style={styles.label}>LOCATION / COURT NAME</Text>
        <TextInput
          style={[styles.input, focusedInput === 'location' && styles.inputFocused]}
          placeholder="e.g. Club Padel Center, Court 4"
          placeholderTextColor={theme.textMuted}
          value={location}
          onChangeText={setLocation}
          onFocus={() => setFocusedInput('location')}
          onBlur={() => setFocusedInput(null)}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>DATE (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, focusedInput === 'date' && styles.inputFocused]}
          placeholder="2026-07-01"
          placeholderTextColor={theme.textMuted}
          value={date}
          onChangeText={setDate}
          onFocus={() => setFocusedInput('date')}
          onBlur={() => setFocusedInput(null)}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>TIME (HH:MM)</Text>
        <TextInput
          style={[styles.input, focusedInput === 'time' && styles.inputFocused]}
          placeholder="19:30"
          placeholderTextColor={theme.textMuted}
          value={time}
          onChangeText={setTime}
          onFocus={() => setFocusedInput('time')}
          onBlur={() => setFocusedInput(null)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>MATCH PREFERENCES</Text>

        <Text style={styles.label}>REQUIRED ATHLETE LEVEL</Text>
        <View style={styles.row}>
          {LEVELS.map((l) => (
            <Pressable
              key={l}
              style={({ pressed }) => [
                styles.chip,
                level === l && styles.chipActive,
                pressed && { scale: 0.96 } as any
              ]}
              onPress={() => setLevel(l)}>
              <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{LEVEL_LABELS[l]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>MAX PLAYERS</Text>
        <TextInput
          style={[styles.input, focusedInput === 'maxPlayers' && styles.inputFocused]}
          keyboardType="number-pad"
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          onFocus={() => setFocusedInput('maxPlayers')}
          onBlur={() => setFocusedInput(null)}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>GAME MODE</Text>
        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              mode === 'individual' && styles.chipActive,
              pressed && { scale: 0.96 } as any
            ]}
            onPress={() => setMode('individual')}>
            <Text style={[styles.chipText, mode === 'individual' && styles.chipTextActive]}>Individual</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              mode === 'pair' && styles.chipActive,
              pressed && { scale: 0.96 } as any
            ]}
            onPress={() => setMode('pair')}>
            <Text style={[styles.chipText, mode === 'pair' && styles.chipTextActive]}>Pair</Text>
          </Pressable>
        </View>

        {mode === 'pair' && (
          <View style={styles.partnerContainer}>
            <Text style={styles.label}>YOUR PARTNER</Text>
            {partners.length === 0 ? (
              <Text style={styles.helperText}>
                No connected partners yet. Add partners in the "Partners" tab first.
              </Text>
            ) : (
              <View style={styles.row}>
                {partners.map((p) => (
                  <Pressable
                    key={p.id}
                    style={({ pressed }) => [
                      styles.chip,
                      partnerId === p.id && styles.chipActive,
                      pressed && { scale: 0.96 } as any
                    ]}
                    onPress={() => setPartnerId(p.id)}>
                    <Text style={[styles.chipText, partnerId === p.id && styles.chipTextActive]}>
                      {p.full_name ?? 'Player'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>VISIBILITY</Text>
        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              visibility === 'open' && styles.chipActive,
              pressed && { scale: 0.96 } as any
            ]}
            onPress={() => setVisibility('open')}>
            <Text style={[styles.chipText, visibility === 'open' && styles.chipTextActive]}>Open</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              visibility === 'closed' && styles.chipActive,
              pressed && { scale: 0.96 } as any
            ]}
            onPress={() => setVisibility('closed')}>
            <Text style={[styles.chipText, visibility === 'closed' && styles.chipTextActive]}>Closed</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>
          {visibility === 'open'
            ? ' Madrid public feed: Anyone with a compatible level can find and join.'
            : 'Private roster: Only players you invite can join.'}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable 
        style={({ pressed }) => [
          styles.button, 
          pressed && styles.buttonPressed,
          createMatch.isPending && styles.buttonDisabled
        ]} 
        onPress={handleCreate} 
        disabled={createMatch.isPending}
      >
        {createMatch.isPending ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <Text style={styles.buttonText}>Publish Match</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24, backgroundColor: theme.background },
  headerContainer: { marginBottom: 8, marginTop: 12 },
  tagline: { fontSize: 11, fontWeight: '800', color: theme.secondary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: theme.text, textTransform: 'uppercase', letterSpacing: -0.5 },
  subtitle: { color: theme.textMuted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  section: { backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: theme.secondary, letterSpacing: 1.5, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', color: theme.text, letterSpacing: 0.8, marginBottom: 6 },
  helperText: { color: theme.textMuted, fontSize: 12, marginTop: 6, lineHeight: 16 },
  input: { 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    backgroundColor: '#191922', 
    color: theme.text 
  },
  inputFocused: {
    borderColor: theme.borderActive,
    backgroundColor: '#1c1c28',
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  chip: { 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: chipRadius, 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    backgroundColor: '#1a1a24' 
  },
  chipActive: { 
    backgroundColor: theme.accent, 
    borderColor: theme.accent,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  chipText: { color: theme.textMuted, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: theme.onAccent, fontWeight: '800' },
  partnerContainer: { marginTop: 14, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 14 },
  button: { 
    backgroundColor: theme.primary, 
    borderRadius: buttonRadius, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 12, 
    marginBottom: 40,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { color: theme.onAccent, fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  error: { color: theme.danger, fontWeight: '600', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
