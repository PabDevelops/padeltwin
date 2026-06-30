import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, cardRadius, buttonRadius } from '@/constants/theme';
import { useSession } from '@/lib/useSession';
import { useCreatePost, useRecentResults } from '@/lib/queries';
import { pickPostPhoto, uploadPostPhoto } from '@/lib/uploadPostPhoto';

function didWin(result: { team_a_player1: string | null; team_a_player2: string | null; winner: string }, userId: string) {
  const inTeamA = result.team_a_player1 === userId || result.team_a_player2 === userId;
  return (inTeamA && result.winner === 'a') || (!inTeamA && result.winner === 'b');
}

export default function NewPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: recentResults } = useRecentResults(userId, 10);
  const createPost = useCreatePost();

  const [photo, setPhoto] = useState<{ uri: string; base64: string; ext: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [linkedMatchId, setLinkedMatchId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handlePickPhoto() {
    const picked = await pickPostPhoto();
    if (!picked) return;
    setPhoto({ uri: `data:image/jpeg;base64,${picked.base64}`, base64: picked.base64, ext: picked.ext });
  }

  async function handlePost() {
    if (!userId || !photo) return;
    setUploading(true);
    try {
      const photoUrl = await uploadPostPhoto(userId, photo.base64, photo.ext);
      createPost.mutate(
        { profileId: userId, photoUrl, caption, matchId: linkedMatchId },
        {
          onSuccess: () => router.back(),
          onError: (err: any) => Alert.alert('Could not post', err.message ?? 'Try again.'),
        }
      );
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Try again.');
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || createPost.isPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={26} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>New Post</Text>
        <Pressable onPress={handlePost} disabled={!photo || busy} style={[styles.postButton, (!photo || busy) && { opacity: 0.4 }]}>
          {busy ? <ActivityIndicator size="small" color={theme.onAccent} /> : <Text style={styles.postButtonText}>POST</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={handlePickPhoto} style={styles.photoPicker}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={36} color={theme.textMuted} />
              <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
            </View>
          )}
        </Pressable>

        <TextInput
          style={styles.captionInput}
          placeholder="Say something about it..."
          placeholderTextColor={theme.textMuted}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        {recentResults && recentResults.length > 0 && (
          <>
            <Text style={styles.label}>LINK A RECENT MATCH (OPTIONAL)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recentResults.slice(0, 8).map((r) => {
                const win = didWin(r, userId!);
                const selected = linkedMatchId === r.match_id;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.matchChip, selected && styles.matchChipActive]}
                    onPress={() => setLinkedMatchId(selected ? null : r.match_id)}
                  >
                    <Text style={[styles.matchChipText, selected && styles.matchChipTextActive]}>
                      {win ? 'WIN' : 'LOSS'} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 16, fontFamily: 'Anton_400Regular', letterSpacing: 0.5 },
  postButton: { backgroundColor: theme.primary, borderRadius: buttonRadius, paddingHorizontal: 16, paddingVertical: 8 },
  postButtonText: { color: theme.onAccent, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  photoPicker: { aspectRatio: 4 / 5, borderRadius: cardRadius, overflow: 'hidden', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoPlaceholderText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  captionInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: cardRadius,
    padding: 14,
    color: theme.text,
    backgroundColor: theme.card,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  label: { fontSize: 9, fontWeight: '900', color: theme.textMuted, letterSpacing: 1 },
  matchChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.card },
  matchChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  matchChipText: { color: theme.textMuted, fontWeight: '800', fontSize: 11 },
  matchChipTextActive: { color: theme.onAccent },
});
