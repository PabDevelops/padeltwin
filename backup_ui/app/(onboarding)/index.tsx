import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/useSession';
import { useProfile, useUpdateProfile } from '@/lib/queries';
import { pickAndUploadAvatar } from '@/lib/uploadAvatar';
import { useDetectCity } from '@/lib/useLocation';
import { theme, buttonRadius, chipRadius } from '@/constants/theme';
import { LEVELS, LEVEL_LABELS, LEVEL_DESCRIPTIONS } from '@/constants/levels';
import type { DominantHand, PlayerLevel, Sex } from '@/types/database';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const HAND_OPTIONS: { value: DominantHand; label: string }[] = [
  { value: 'right', label: 'Right-handed' },
  { value: 'left', label: 'Left-handed' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile();
  const { detectCity, loading: locating } = useDetectCity();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [level, setLevel] = useState<PlayerLevel>('intermedio');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [dominantHand, setDominantHand] = useState<DominantHand | null>(null);
  const [club, setClub] = useState('');
  const [racket, setRacket] = useState('');
  const [apparelBrand, setApparelBrand] = useState('');
  const [zone, setZone] = useState('');
  const [lookingForPartner, setLookingForPartner] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatar_url);
    if (profile.level) setLevel(profile.level);
    if (profile.height_cm) setHeightCm(String(profile.height_cm));
    setSex(profile.sex);
    setDominantHand(profile.dominant_hand);
    setClub(profile.club ?? '');
    setRacket(profile.racket ?? '');
    setApparelBrand(profile.apparel_brand ?? '');
    setZone(profile.zone ?? '');
    setLookingForPartner(profile.looking_for_partner);
  }, [profile]);

  async function handlePickAvatar() {
    if (!userId) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setAvatarUrl(url);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDetectLocation() {
    const city = await detectCity();
    if (city) setZone(city);
  }

  function handleFinish() {
    if (!userId) return;
    updateProfile.mutate(
      {
        id: userId,
        level,
        height_cm: heightCm ? Number(heightCm) : null,
        sex,
        dominant_hand: dominantHand,
        club: club || null,
        racket: racket || null,
        apparel_brand: apparelBrand || null,
        zone: zone || null,
        looking_for_partner: lookingForPartner,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      },
      {
        onSuccess: () => router.replace('/(tabs)'),
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>This helps us match you with the right players and matches.</Text>

      <Pressable style={styles.avatarPicker} onPress={handlePickAvatar} disabled={uploadingAvatar}>
        {uploadingAvatar ? (
          <ActivityIndicator color={theme.accent} />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarPlaceholderText}>Add photo</Text>
        )}
      </Pressable>

      <Text style={styles.label}>Level</Text>
      <View style={styles.chipRow}>
        {LEVELS.map((l) => (
          <Pressable
            key={l}
            style={[styles.chip, level === l && styles.chipActive]}
            onPress={() => setLevel(l)}>
            <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{LEVEL_LABELS[l]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.helperText}>{LEVEL_DESCRIPTIONS[level]}</Text>

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="e.g. 178"
        placeholderTextColor={theme.textMuted}
        value={heightCm}
        onChangeText={setHeightCm}
      />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.chipRow}>
        {SEX_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.chip, sex === o.value && styles.chipActive]}
            onPress={() => setSex(o.value)}>
            <Text style={[styles.chipText, sex === o.value && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Dominant hand</Text>
      <View style={styles.chipRow}>
        {HAND_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.chip, dominantHand === o.value && styles.chipActive]}
            onPress={() => setDominantHand(o.value)}>
            <Text style={[styles.chipText, dominantHand === o.value && styles.chipTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Club</Text>
      <TextInput
        style={styles.input}
        placeholder="Your club or team"
        placeholderTextColor={theme.textMuted}
        value={club}
        onChangeText={setClub}
      />

      <Text style={styles.label}>Racket</Text>
      <TextInput
        style={styles.input}
        placeholder="Brand / model"
        placeholderTextColor={theme.textMuted}
        value={racket}
        onChangeText={setRacket}
      />

      <Text style={styles.label}>Apparel brand</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Nike, Asics"
        placeholderTextColor={theme.textMuted}
        value={apparelBrand}
        onChangeText={setApparelBrand}
      />

      <Text style={styles.label}>City</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Edinburgh"
        placeholderTextColor={theme.textMuted}
        value={zone}
        onChangeText={setZone}
      />
      <Pressable style={styles.locationButton} onPress={handleDetectLocation} disabled={locating}>
        {locating ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Text style={styles.locationButtonText}>Use my location</Text>
        )}
      </Pressable>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Looking for a partner</Text>
        <Switch
          value={lookingForPartner}
          onValueChange={setLookingForPartner}
          trackColor={{ true: theme.accent, false: theme.border }}
        />
      </View>

      <Pressable style={styles.button} onPress={handleFinish} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Finish</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 4, backgroundColor: theme.background },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.text },
  subtitle: { color: theme.textMuted, marginBottom: 16 },
  avatarPicker: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: { width: 100, height: 100 },
  avatarPlaceholderText: { color: theme.textMuted, fontSize: 12, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, color: theme.text },
  helperText: { color: theme.textMuted, marginTop: 6, fontSize: 13 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 16, marginTop: 4, backgroundColor: theme.card, color: theme.text },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: chipRadius, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.card },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  locationButton: { marginTop: 8, alignSelf: 'flex-start' },
  locationButtonText: { color: theme.accent, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  button: { backgroundColor: theme.primary, borderRadius: buttonRadius, padding: 14, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
