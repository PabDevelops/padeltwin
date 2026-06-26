import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMatches } from '@/lib/queries';
import type { MatchWithPlayers, PlayerLevel } from '@/types/database';
import { theme, cardRadius, chipRadius } from '@/constants/theme';
import { LEVELS, LEVEL_LABELS } from '@/constants/levels';

export default function MatchSearchScreen() {
  const router = useRouter();
  const [zone, setZone] = useState('');
  const [level, setLevel] = useState<PlayerLevel | undefined>(undefined);
  const { data: matches, isLoading, refetch, isRefetching } = useMatches({ zone, level });

  function renderItem({ item }: { item: MatchWithPlayers }) {
    const joinedCount = item.match_players?.length ?? 0;
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/match/${item.id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.location}</Text>
          <Text style={styles.modeBadge}>{item.mode === 'pair' ? 'Pair' : 'Individual'}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{new Date(item.date_time).toLocaleString('en-GB')}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.badge}>{LEVEL_LABELS[item.level]}</Text>
          <Text style={styles.slots}>
            {joinedCount}/{item.max_players} players
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find matches</Text>

      <TextInput
        style={styles.input}
        placeholder="Filter by city"
        placeholderTextColor={theme.textMuted}
        value={zone}
        onChangeText={setZone}
      />

      <View style={styles.levelRow}>
        <Pressable
          style={[styles.levelChip, !level && styles.levelChipActive]}
          onPress={() => setLevel(undefined)}>
          <Text style={[styles.levelChipText, !level && styles.levelChipTextActive]}>All</Text>
        </Pressable>
        {LEVELS.map((l) => (
          <Pressable
            key={l}
            style={[styles.levelChip, level === l && styles.levelChipActive]}
            onPress={() => setLevel(l)}>
            <Text style={[styles.levelChipText, level === l && styles.levelChipTextActive]}>
              {LEVEL_LABELS[l]}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No open matches right now.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.background },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: theme.text },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 12, backgroundColor: theme.card, color: theme.text },
  levelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  levelChip: { borderWidth: 1, borderColor: theme.border, borderRadius: chipRadius, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: theme.card },
  levelChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  levelChipText: { color: theme.text, fontWeight: '600' },
  levelChipTextActive: { color: '#fff' },
  card: { borderRadius: cardRadius, padding: 16, backgroundColor: theme.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  modeBadge: { color: theme.textMuted, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  cardSubtitle: { color: theme.textMuted, marginTop: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  badge: { backgroundColor: theme.accent, color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12 },
  slots: { color: theme.text, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 32, color: theme.textMuted },
});
