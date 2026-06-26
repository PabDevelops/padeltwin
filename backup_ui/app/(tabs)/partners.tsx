import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/lib/useSession';
import { useCompatiblePlayers, useProfile, usePartnerRequests, useSendPartnerRequest } from '@/lib/queries';
import type { PartnerRequestWithProfiles, Profile } from '@/types/database';
import { theme, buttonRadius, cardRadius } from '@/constants/theme';
import { LEVEL_LABELS } from '@/constants/levels';

function requestWith(requests: PartnerRequestWithProfiles[], userId: string, otherId: string) {
  return requests.find(
    (r) => (r.from_id === userId && r.to_id === otherId) || (r.from_id === otherId && r.to_id === userId)
  );
}

export default function PartnersScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: players, isLoading } = useCompatiblePlayers(userId, profile);
  const { data: requests } = usePartnerRequests(userId);
  const sendRequest = useSendPartnerRequest();

  function renderItem({ item }: { item: Profile }) {
    const existing = userId && requests ? requestWith(requests, userId, item.id) : undefined;

    let buttonLabel = 'Connect';
    let disabled = false;
    if (existing) {
      disabled = true;
      buttonLabel =
        existing.status === 'pending' ? 'Pending' : existing.status === 'accepted' ? 'Connected' : 'Declined';
    }

    return (
      <View style={styles.card}>
        <View style={styles.avatarBox}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholder}>{(item.full_name ?? '?').slice(0, 2).toUpperCase()}</Text>
          )}
          {item.looking_for_partner && (
            <View style={styles.lookingBadge}>
              <Text style={styles.lookingBadgeText}>Looking for partner</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle}>{item.full_name ?? 'Player'}</Text>
        <View style={styles.cardRow}>
          {item.level && <Text style={styles.levelBadge}>{LEVEL_LABELS[item.level]}</Text>}
          <Text style={styles.elo}>{item.elo} ELO</Text>
        </View>
        <Pressable
          style={[styles.button, disabled && styles.buttonDisabled]}
          disabled={disabled || sendRequest.isPending}
          onPress={() => userId && sendRequest.mutate({ fromId: userId, toId: item.id })}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partners</Text>
      <Text style={styles.subtitle}>Players matching your level and city</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No compatible players yet. Complete your level and city in your profile.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.background },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.text },
  subtitle: { color: theme.textMuted, marginBottom: 12 },
  card: { flex: 1, borderRadius: cardRadius, padding: 12, backgroundColor: theme.card },
  avatarBox: {
    aspectRatio: 1,
    borderRadius: cardRadius - 4,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { color: theme.textMuted, fontSize: 28, fontWeight: '700' },
  lookingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 3,
  },
  lookingBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  levelBadge: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  elo: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  button: { backgroundColor: theme.primary, borderRadius: buttonRadius, padding: 8, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: theme.textMuted },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 32, color: theme.textMuted },
});
