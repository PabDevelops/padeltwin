import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useProfile, useUpdateProfile } from '@/lib/queries';
import { pickAndUploadAvatar } from '@/lib/uploadAvatar';
import { theme, buttonRadius } from '@/constants/theme';
import { VerifiedLocation } from '@/components/VerifiedLocation';
import { BackHeader } from '@/components/BackHeader';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [zone, setZone] = useState('');
  const [country, setCountry] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setZone(profile.zone ?? '');
      setCountry(profile.country ?? '');
    }
  }, [profile]);

  if (!userId || !profile) {
    return (
      <View style={styles.centerContainer}>
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
    updateProfile.mutate(
      { id: userId!, full_name: fullName, bio: bio.trim() || null, zone, country: country || null },
      { onSuccess: () => router.back() }
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BackHeader title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Image source={require('@/assets/images/icon.png')} style={styles.avatarPlaceholderLogo} resizeMode="contain" />
              </View>
            )}
            <Pressable style={styles.cameraBadge} onPress={handlePickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? <ActivityIndicator size="small" color={theme.onAccent} /> : <Ionicons name="camera" size={14} color={theme.onAccent} />}
            </Pressable>
          </View>
          <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
            <Text style={styles.changePhotoText}>Change photo</Text>
          </Pressable>
        </View>

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

        <Text style={[styles.label, { marginTop: 16 }]}>BIO</Text>
        <TextInput
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }, focusedInput === 'bio' && styles.inputFocused]}
          value={bio}
          onChangeText={setBio}
          placeholder="A short line about you and your game"
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={120}
          onFocus={() => setFocusedInput('bio')}
          onBlur={() => setFocusedInput(null)}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>LOCATION</Text>
        <VerifiedLocation
          city={zone || null}
          country={country || null}
          onDetected={(loc) => {
            setZone(loc.city);
            setCountry(loc.country);
          }}
        />

        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.9 }, updateProfile.isPending && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? <ActivityIndicator color={theme.onAccent} /> : <Text style={styles.saveButtonText}>Save</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 96, height: 96, marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: theme.accent },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: theme.accent,
    backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center',
  },
  avatarPlaceholderLogo: { width: 48, height: 48, opacity: 0.5 },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 12,
    backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.background,
  },
  changePhotoText: { color: theme.accent, fontSize: 12, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', color: theme.text, letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)', color: theme.text },
  inputFocused: { borderColor: theme.accent, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  saveButton: {
    backgroundColor: theme.primary, borderRadius: buttonRadius, padding: 16, alignItems: 'center', marginTop: 24,
  },
  saveButtonText: { color: theme.onAccent, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});
