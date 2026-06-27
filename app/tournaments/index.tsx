import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useProfile, useTournaments } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function TournamentsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: tournaments, isLoading } = useTournaments(profile?.zone);

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={tournaments ?? []}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      ListEmptyComponent={<Text style={styles.empty}>No tournaments scheduled near you right now.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/tournaments/${item.id}` as any)}>
          <View style={styles.iconWrap}>
            <Ionicons name="trophy" size={20} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.format === 'bracket' ? 'Knockout bracket' : 'Round robin'} · {item.status === 'completed' ? 'Completed' : 'In progress'}
              {item.zone ? ` · ${item.zone}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.text, fontWeight: '800', fontSize: 14 },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});
