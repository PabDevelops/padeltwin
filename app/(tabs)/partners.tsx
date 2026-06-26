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

    let buttonLabel = 'CONNECT';
    let disabled = false;
    let buttonVariant: 'primary' | 'pending' | 'connected' = 'primary';
    
    if (existing) {
      disabled = true;
      if (existing.status === 'pending') {
        buttonLabel = 'PENDING';
        buttonVariant = 'pending';
      } else if (existing.status === 'accepted') {
        buttonLabel = 'CONNECTED';
        buttonVariant = 'connected';
      } else {
        buttonLabel = 'DECLINED';
        buttonVariant = 'pending';
      }
    }

    return (
      <View style={styles.card}>
        <View style={styles.avatarBox}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.avatarPlaceholder}>{(item.full_name ?? '?').slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          {item.looking_for_partner && (
            <View style={styles.lookingBadge}>
              <Text style={styles.lookingBadgeText}>ACTIVE FINDER</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.full_name ?? 'Player'}
        </Text>
        
        <View style={styles.cardRow}>
          <Text style={styles.levelBadge}>
            {item.level ? LEVEL_LABELS[item.level].toUpperCase() : 'NO LEVEL'}
          </Text>
          <Text style={styles.elo}>{item.elo} <Text style={{ fontSize: 9, color: theme.textMuted }}>ELO</Text></Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            buttonVariant === 'primary' && styles.buttonPrimary,
            buttonVariant === 'pending' && styles.buttonPending,
            buttonVariant === 'connected' && styles.buttonConnected,
            pressed && !disabled && { scale: 0.96 } as any
          ]}
          disabled={disabled || sendRequest.isPending}
          onPress={() => userId && sendRequest.mutate({ fromId: userId, toId: item.id })}>
          <Text style={[
            styles.buttonText,
            buttonVariant === 'primary' && styles.buttonTextPrimary,
            buttonVariant === 'pending' && styles.buttonTextPending,
            buttonVariant === 'connected' && styles.buttonTextConnected,
          ]}>
            {buttonLabel}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.tagline}>ATHLETE MATCHMAKING</Text>
        <Text style={styles.title}>Partners</Text>
        <Text style={styles.subtitle}>Players matching your skill level and location</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={theme.accent} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>No compatible players yet.</Text>
              <Text style={styles.emptySub}>Please check your Level and City configurations in your profile.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.background },
  headerContainer: { marginBottom: 16, marginTop: 12 },
  tagline: { fontSize: 11, fontWeight: '800', color: theme.secondary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: theme.text, textTransform: 'uppercase', letterSpacing: -0.5 },
  subtitle: { color: theme.textMuted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  card: { 
    flex: 1, 
    borderRadius: cardRadius, 
    padding: 12, 
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  avatarBox: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1E1E28',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatarImage: { width: '100%', height: '100%' },
  placeholderContainer: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#13131A' },
  avatarPlaceholder: { color: theme.textMuted, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  lookingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 83, 27, 0.9)',
    paddingVertical: 4,
  },
  lookingBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: theme.text, textTransform: 'uppercase', letterSpacing: 0.2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  levelBadge: { color: theme.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  elo: { color: theme.text, fontSize: 12, fontWeight: '800' },
  button: { 
    borderRadius: buttonRadius, 
    paddingVertical: 10, 
    alignItems: 'center', 
    marginTop: 12,
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: theme.secondary,
    borderColor: theme.secondary,
  },
  buttonPending: {
    backgroundColor: 'transparent',
    borderColor: theme.border,
  },
  buttonConnected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: theme.success,
  },
  buttonText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  buttonTextPrimary: { color: '#08080C' },
  buttonTextPending: { color: theme.textMuted },
  buttonTextConnected: { color: theme.success },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  empty: { textAlign: 'center', color: theme.text, fontSize: 16, fontWeight: '700' },
  emptySub: { textAlign: 'center', color: theme.textMuted, fontSize: 13, marginTop: 4, paddingHorizontal: 16 },
});
