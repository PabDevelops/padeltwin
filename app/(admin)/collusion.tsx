import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAdminCollusionCandidates } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminCollusion() {
  const { data: candidates, isLoading } = useAdminCollusionCandidates();

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={candidates ?? []}
      keyExtractor={(c) => c.profile_id}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      ListHeaderComponent={
        <Text style={styles.intro}>
          Players whose confirmed matches are heavily concentrated against one opponent, combined with fast recent ELO
          gain. Not auto-enforced — review and decide manually.
        </Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>No flagged players right now.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.full_name ?? 'Player'}</Text>
          <Text style={styles.meta}>
            {item.total_matches} matches · {item.distinct_opponents} distinct opponents
          </Text>
          <Text style={styles.highlight}>
            {Math.round(item.repeat_ratio * 100)}% of matches vs {item.top_opponent_name ?? 'one player'} ({item.top_opponent_matches} games)
          </Text>
          <Text style={[styles.highlight, { color: item.elo_gain_last_10 > 0 ? theme.accent : theme.textMuted }]}>
            ELO gain (last 10): {item.elo_gain_last_10 > 0 ? '+' : ''}{item.elo_gain_last_10}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  intro: { color: theme.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 4 },
  name: { color: theme.text, fontWeight: '800', fontSize: 14 },
  meta: { color: theme.textMuted, fontSize: 12 },
  highlight: { color: theme.text, fontWeight: '700', fontSize: 12, marginTop: 2 },
});
