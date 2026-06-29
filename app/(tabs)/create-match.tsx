import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCreateMatch, usePartnerRequests, useProfile } from '@/lib/queries';
import { useSession } from '@/lib/useSession';
import type { MatchMode, MatchVisibility, PartnerRequestWithProfiles } from '@/types/database';
import { theme, buttonRadius, chipRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { levelFromElo } from '@/lib/eloPlacement';

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulsingDot, { opacity }]} />;
}

// Slot-machine style roll: starts a little off target and spins down/up
// into place, instead of just popping the final number in.
function useRollingNumber(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const spinOffset = 80 + Math.round(Math.random() * 60);
    const startValue = target + (Math.random() > 0.5 ? spinOffset : -spinOffset);
    const start = Date.now();
    let raf: number;

    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + (target - startValue) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export default function CreateMatchScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const createMatch = useCreateMatch();
  const { data: requests } = usePartnerRequests(userId);

  const partners = (requests ?? [])
    .filter((r): r is PartnerRequestWithProfiles => r.status === 'accepted')
    .map((r) => (r.from_id === userId ? r.to_profile : r.from_profile))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const [location, setLocation] = useState('');
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [timeValue, setTimeValue] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mode, setMode] = useState<MatchMode>('individual');
  const [visibility, setVisibility] = useState<MatchVisibility>('open');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const requiredLevel = levelFromElo(profile?.elo ?? 1000);
  const baseElo = profile?.elo ?? 1000;
  const rangeLow = useRollingNumber(baseElo - 100);
  const rangeHigh = useRollingNumber(baseElo + 100);

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selected) setDateValue(selected);
  }

  function handleTimeChange(event: DateTimePickerEvent, selected?: Date) {
    setShowTimePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selected) setTimeValue(selected);
  }

  function handleCreate() {
    setError(null);
    if (!userId) return;

    if (!location || !dateValue || !timeValue) {
      setError('Add a location, date and time for the match.');
      return;
    }
    if (mode === 'pair' && !partnerId) {
      setError('Pick your partner for a pair match.');
      return;
    }

    const dateTime = new Date(dateValue);
    dateTime.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);

    const creatorElo = profile?.elo ?? 1000;

    createMatch.mutate(
      {
        created_by: userId,
        location,
        date_time: dateTime.toISOString(),
        level: requiredLevel,
        max_players: 4,
        min_elo: creatorElo - 100,
        max_elo: creatorElo + 100,
        mode,
        visibility,
        partnerId: mode === 'pair' ? partnerId! : undefined,
      },
      {
        onSuccess: (match) => {
          setLocation('');
          setDateValue(null);
          setTimeValue(null);
          router.push(`/match/${match.id}`);
        },
        onError: (err: any) => setError(err.message ?? 'Could not create the match'),
      }
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tagline}>HOST A MATCH</Text>
            <Text style={styles.title}>Create match</Text>
          </View>
          <View style={styles.eloPill}>
            <PulsingDot />
            <Text style={styles.eloPillText}>
              {rangeLow}–{rangeHigh}
            </Text>
            <Text style={styles.eloPillLabel}>PS SCORE</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Set up a match for other compatible athletes to join</Text>
      </View>

      <GlassCard style={styles.section} contentStyle={{ padding: 16 }}>
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

        <Text style={[styles.label, { marginTop: 14 }]}>DATE</Text>
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={dateValue ? styles.pickerValue : styles.pickerPlaceholder}>
            {dateValue
              ? dateValue.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
              : 'Select a date'}
          </Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={dateValue ?? new Date()}
            mode="date"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        <Text style={[styles.label, { marginTop: 14 }]}>TIME</Text>
        <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
          <Text style={timeValue ? styles.pickerValue : styles.pickerPlaceholder}>
            {timeValue
              ? timeValue.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : 'Select a time'}
          </Text>
        </Pressable>
        {showTimePicker && (
          <DateTimePicker value={timeValue ?? new Date()} mode="time" onChange={handleTimeChange} />
        )}
      </GlassCard>

      <GlassCard style={styles.section} contentStyle={{ padding: 16 }}>
        <Text style={styles.sectionHeader}>MATCH PREFERENCES</Text>

        <Text style={styles.label}>GAME MODE</Text>
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
      </GlassCard>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24, backgroundColor: 'transparent' },
  headerContainer: { marginBottom: 8, marginTop: 12 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pulsingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.success },
  eloPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 115, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 115, 0.25)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  eloPillText: { fontSize: 13, fontWeight: '900', color: theme.text },
  eloPillLabel: { fontSize: 9, fontWeight: '800', color: theme.success, letterSpacing: 0.5 },
  tagline: { fontSize: 11, fontWeight: '800', color: theme.secondary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28,  color: theme.text, textTransform: 'uppercase', letterSpacing: -0.5},
  subtitle: { color: theme.textMuted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  section: { borderRadius: 16 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: theme.secondary, letterSpacing: 1.5, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)', paddingBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', color: theme.text, letterSpacing: 0.8, marginBottom: 6 },
  helperText: { color: theme.textMuted, fontSize: 12, marginTop: 6, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: theme.text
  },
  inputFocused: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pickerValue: { color: theme.text, fontSize: 16 },
  pickerPlaceholder: { color: theme.textMuted, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: chipRadius,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)'
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
  partnerContainer: { marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', paddingTop: 14 },
  button: {
    backgroundColor: theme.primary,
    borderRadius: buttonRadius,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 110,
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
  buttonText: { color: theme.onAccent, fontSize: 16,  textTransform: 'uppercase', letterSpacing: 0.5},
  error: { color: theme.danger, fontWeight: '600', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
