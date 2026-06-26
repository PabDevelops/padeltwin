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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
        <ActivityIndicator color={theme.accent} size="large" />
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
      <View style={styles.profileHeader}>
        <Pressable 
          style={({ pressed }) => [
            styles.avatarPicker, 
            pressed && { opacity: 0.8 },
            profile.avatar_url ? styles.avatarPickerActive : null
          ]} 
          onPress={handlePickAvatar} 
          disabled={uploadingAvatar}
        >
          {uploadingAvatar ? (
            <ActivityIndicator color={theme.accent} />
          ) : profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholderText}>
              {fullName ? fullName.slice(0, 2).toUpperCase() : 'ADD'}
            </Text>
          )}
        </Pressable>
        <Text style={styles.name}>{profile.full_name ?? 'Player'}</Text>
        {profile.club ? (
          <Text style={styles.clubBadge}>{profile.club.toUpperCase()}</Text>
        ) : (
          <Text style={styles.eloBadge}>{profile.elo} ELO RATING</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ATHLETE DETAILS</Text>

        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={[styles.input, focusedInput === 'name' && styles.inputFocused]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocusedInput('name')}
          onBlur={() => setFocusedInput(null)}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>CITY</Text>
        <TextInput
          style={[styles.input, focusedInput === 'city' && styles.inputFocused]}
          value={zone}
          onChangeText={setZone}
          placeholder="e.g. Madrid"
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocusedInput('city')}
          onBlur={() => setFocusedInput(null)}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>SKILL LEVEL</Text>
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
              <Text style={[styles.chipText, level === l && styles.chipTextActive]}>
                {LEVEL_LABELS[l]}
              </Text>
            </Pressable>
          ))}
        </View>
        {level && <Text style={styles.helperText}>{LEVEL_DESCRIPTIONS[level]}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>EQUIPMENT CONFIG</Text>
        
        <Text style={styles.label}>CLUB OR COURT</Text>
        <TextInput
          style={[styles.input, focusedInput === 'club' && styles.inputFocused]}
          value={club}
          onChangeText={setClub}
          placeholder="Your club or team"
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocusedInput('club')}
          onBlur={() => setFocusedInput(null)}
        />
        
        <Text style={[styles.label, { marginTop: 14 }]}>RACKET MODEL</Text>
        <TextInput
          style={[styles.input, focusedInput === 'racket' && styles.inputFocused]}
          value={racket}
          onChangeText={setRacket}
          placeholder="Brand / model"
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocusedInput('racket')}
          onBlur={() => setFocusedInput(null)}
        />
        
        <Text style={[styles.label, { marginTop: 14 }]}>PREFERRED APPAREL BRAND</Text>
        <TextInput
          style={[styles.input, focusedInput === 'apparel' && styles.inputFocused]}
          value={apparelBrand}
          onChangeText={setApparelBrand}
          placeholder="e.g. Nike, Asics"
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocusedInput('apparel')}
          onBlur={() => setFocusedInput(null)}
        />
      </View>

      <View style={[styles.section, styles.switchRow]}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={[styles.label, { marginTop: 0 }]}>PARTNER SEARCH</Text>
          <Text style={styles.helperText}>Make profile visible in the matchmaking pool.</Text>
        </View>
        <Switch
          value={lookingForPartner}
          onValueChange={setLookingForPartner}
          trackColor={{ true: theme.accent, false: theme.border }}
          thumbColor={lookingForPartner ? theme.secondary : '#7F7F8F'}
        />
      </View>

      <Pressable 
        style={({ pressed }) => [
          styles.button, 
          pressed && styles.buttonPressed,
          updateProfile.isPending && styles.buttonDisabled
        ]} 
        onPress={handleSave} 
        disabled={updateProfile.isPending}
      >
        {updateProfile.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </Pressable>

      {pendingReceived.length > 0 && (
        <View style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>PARTNER REQUESTS</Text>
          {pendingReceived.map((r) => (
            <View key={r.id} style={styles.requestCard}>
              <Text style={styles.requestName}>{otherProfile(r)?.full_name ?? 'Player'}</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.smallButton, 
                    styles.acceptButton,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => respondRequest.mutate({ requestId: r.id, status: 'accepted' })}>
                  <Text style={styles.smallButtonText}>ACCEPT</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.smallButton, 
                    styles.rejectButton,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => respondRequest.mutate({ requestId: r.id, status: 'rejected' })}>
                  <Text style={styles.smallButtonText}>DECLINE</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {accepted.length > 0 && (
        <View style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>MY PARTNERS</Text>
          {accepted.map((r) => (
            <Pressable
              key={r.id}
              style={({ pressed }) => [
                styles.partnerRequestCard,
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
              ]}
              onPress={() => router.push({ pathname: '/chat/[requestId]', params: { requestId: r.id } })}>
              <View style={styles.partnerInfo}>
                <Text style={styles.requestName}>{otherProfile(r)?.full_name ?? 'Player'}</Text>
                <Text style={styles.partnerCity}>{otherProfile(r)?.zone ?? 'Madrid'}</Text>
              </View>
              <View style={styles.chatLinkBadge}>
                <Text style={styles.chatLinkText}>CHAT</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable 
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && { backgroundColor: 'rgba(239, 83, 80, 0.1)' }
        ]} 
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>LOG OUT PROFILE</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { padding: 24, gap: 20, backgroundColor: theme.background },
  profileHeader: { alignItems: 'center', marginTop: 12, marginBottom: 8 },
  avatarPicker: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatarPickerActive: {
    borderColor: theme.accent,
  },
  avatarImage: { width: 104, height: 104 },
  avatarPlaceholderText: { color: theme.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  name: { textAlign: 'center', fontSize: 24, fontWeight: '900', color: theme.text, marginTop: 14, textTransform: 'uppercase', letterSpacing: -0.5 },
  clubBadge: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(210, 252, 56, 0.15)',
    borderWidth: 1,
    borderColor: theme.secondary,
    color: theme.secondary,
    fontWeight: '800',
    fontSize: 10,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    letterSpacing: 1,
  },
  eloBadge: {
    alignSelf: 'center',
    marginTop: 8,
    color: theme.textMuted,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
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
  chipTextActive: { color: '#fff', fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { 
    backgroundColor: theme.primary, 
    borderRadius: buttonRadius, 
    padding: 16, 
    alignItems: 'center', 
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
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  partnersSection: { gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.secondary, letterSpacing: 1.5 },
  requestCard: {
    borderRadius: cardRadius,
    padding: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  partnerRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: cardRadius,
    padding: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  partnerInfo: { flex: 1, marginRight: 12 },
  partnerCity: { color: theme.textMuted, fontSize: 12, marginTop: 2, fontWeight: '600' },
  requestName: { fontSize: 15, fontWeight: '800', color: theme.text, textTransform: 'uppercase', letterSpacing: 0.2 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  smallButtonText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  acceptButton: { backgroundColor: theme.success },
  rejectButton: { backgroundColor: theme.danger },
  chatLinkBadge: { backgroundColor: 'rgba(255, 83, 27, 0.15)', borderWidth: 1, borderColor: theme.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  chatLinkText: { color: theme.accent, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  signOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: buttonRadius,
    borderWidth: 1,
    borderColor: theme.danger,
    padding: 14,
    marginTop: 16,
    marginBottom: 40,
  },
  signOutText: { color: theme.danger, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
