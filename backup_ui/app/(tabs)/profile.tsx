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
import { useProfile, useUpdateProfile, usePartnerRequests, useRespondPartnerRequest } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { pickAndUploadAvatar } from '@/lib/uploadAvatar';
import type { PartnerRequestWithProfiles, PlayerLevel } from '@/types/database';
import { theme, buttonRadius, cardRadius, chipRadius } from '@/constants/theme';
import { LEVELS, LEVEL_LABELS, LEVEL_DESCRIPTIONS } from '@/constants/levels';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile, isLoading } = useProfile(userId);
  const updateProfile = useUpdateProfile();
  const { data: requests } = usePartnerRequests(userId);
  const respondRequest = useRespondPartnerRequest();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const pendingReceived = (requests ?? []).filter((r) => r.status === 'pending' && r.to_id === userId);
  const accepted = (requests ?? []).filter((r) => r.status === 'accepted');

  function otherProfile(r: PartnerRequestWithProfiles) {
    return r.from_id === userId ? r.to_profile : r.from_profile;
  }

  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('');
  const [level, setLevel] = useState<PlayerLevel | null>(null);
  const [club, setClub] = useState('');
  const [racket, setRacket] = useState('');
  const [apparelBrand, setApparelBrand] = useState('');
  const [lookingForPartner, setLookingForPartner] = useState(true);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setZone(profile.zone ?? '');
      setLevel(profile.level);
      setClub(profile.club ?? '');
      setRacket(profile.racket ?? '');
      setApparelBrand(profile.apparel_brand ?? '');
      setLookingForPartner(profile.looking_for_partner);
    }
  }, [profile]);

  if (isLoading || !userId || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  async function handlePickAvatar() {
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar(userId!);
      if (url) updateProfile.mutate({ id: userId!, avatar_url: url });
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleSave() {
    updateProfile.mutate({
      id: userId!,
      full_name: fullName,
      zone,
      level,
      club: club || null,
      racket: racket || null,
      apparel_brand: apparelBrand || null,
      looking_for_partner: lookingForPartner,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.avatarPicker} onPress={handlePickAvatar} disabled={uploadingAvatar}>
        {uploadingAvatar ? (
          <ActivityIndicator color={theme.accent} />
        ) : profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarPlaceholderText}>
            {fullName ? fullName.slice(0, 2).toUpperCase() : 'Add photo'}
          </Text>
        )}
      </Pressable>
      <Text style={styles.name}>{profile.full_name ?? 'Player'}</Text>
      {profile.club && <Text style={styles.clubBadge}>{profile.club}</Text>}

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your name"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={styles.label}>City</Text>
      <TextInput
        style={styles.input}
        value={zone}
        onChangeText={setZone}
        placeholder="e.g. Edinburgh"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={styles.label}>Level</Text>
      <View style={styles.row}>
        {LEVELS.map((l) => (
          <Pressable
            key={l}
            style={[styles.chip, level === l && styles.chipActive]}
            onPress={() => setLevel(l)}>
            <Text style={[styles.chipText, level === l && styles.chipTextActive]}>
              {LEVEL_LABELS[l]}
            </Text>
          </Pressable>
        ))}
      </View>
      {level && <Text style={styles.helperText}>{LEVEL_DESCRIPTIONS[level]}</Text>}

      <Text style={styles.sectionTitle}>Equipment</Text>
      <Text style={styles.label}>Club</Text>
      <TextInput
        style={styles.input}
        value={club}
        onChangeText={setClub}
        placeholder="Your club or team"
        placeholderTextColor={theme.textMuted}
      />
      <Text style={styles.label}>Racket</Text>
      <TextInput
        style={styles.input}
        value={racket}
        onChangeText={setRacket}
        placeholder="Brand / model"
        placeholderTextColor={theme.textMuted}
      />
      <Text style={styles.label}>Apparel brand</Text>
      <TextInput
        style={styles.input}
        value={apparelBrand}
        onChangeText={setApparelBrand}
        placeholder="e.g. Nike, Asics"
        placeholderTextColor={theme.textMuted}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Looking for a partner</Text>
        <Switch
          value={lookingForPartner}
          onValueChange={setLookingForPartner}
          trackColor={{ true: theme.accent, false: theme.border }}
        />
      </View>

      <Pressable style={styles.button} onPress={handleSave} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save</Text>
        )}
      </Pressable>

      {pendingReceived.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Requests received</Text>
          {pendingReceived.map((r) => (
            <View key={r.id} style={styles.requestCard}>
              <Text style={styles.requestName}>{otherProfile(r)?.full_name ?? 'Player'}</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={[styles.smallButton, styles.acceptButton]}
                  onPress={() => respondRequest.mutate({ requestId: r.id, status: 'accepted' })}>
                  <Text style={styles.buttonText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, styles.rejectButton]}
                  onPress={() => respondRequest.mutate({ requestId: r.id, status: 'rejected' })}>
                  <Text style={styles.buttonText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}

      {accepted.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>My partners</Text>
          {accepted.map((r) => (
            <Pressable
              key={r.id}
              style={styles.requestCard}
              onPress={() => router.push({ pathname: '/chat/[requestId]', params: { requestId: r.id } })}>
              <Text style={styles.requestName}>{otherProfile(r)?.full_name ?? 'Player'}</Text>
              <Text style={styles.chatLink}>Open chat →</Text>
            </Pressable>
          ))}
        </>
      )}

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { padding: 24, gap: 8, backgroundColor: theme.background },
  avatarPicker: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96 },
  avatarPlaceholderText: { color: theme.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 8 },
  name: { textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: theme.text, marginTop: 12 },
  clubBadge: {
    alignSelf: 'center',
    marginTop: 6,
    backgroundColor: theme.card,
    color: theme.accent,
    fontWeight: '600',
    fontSize: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, color: theme.text },
  helperText: { color: theme.textMuted, marginTop: 6, fontSize: 13 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: theme.card, color: theme.text },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: chipRadius, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.card },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  button: { backgroundColor: theme.primary, borderRadius: buttonRadius, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOut: { alignItems: 'center', marginTop: 16, padding: 8 },
  signOutText: { color: theme.danger },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 4, color: theme.text },
  requestCard: {
    borderRadius: cardRadius,
    padding: 12,
    backgroundColor: theme.card,
    marginTop: 8,
  },
  requestName: { fontSize: 16, fontWeight: '600', color: theme.text },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallButton: { flex: 1, borderRadius: buttonRadius, padding: 8, alignItems: 'center' },
  acceptButton: { backgroundColor: theme.primary },
  rejectButton: { backgroundColor: theme.danger },
  chatLink: { color: theme.accent, marginTop: 4, fontWeight: '600' },
});
