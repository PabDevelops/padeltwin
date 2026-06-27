import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminDeleteAchievement, useAdminRecentAchievements } from '@/lib/queries';
import { ACHIEVEMENT_LABELS } from '@/constants/achievements';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminModeration() {
  const { data: achievements, isLoading } = useAdminRecentAchievements();
  const deleteAchievement = useAdminDeleteAchievement();

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={achievements ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      ListEmptyComponent={<Text style={styles.empty}>No recent posts.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.full_name ?? 'Player'}</Text>
            <Text style={styles.meta}>{ACHIEVEMENT_LABELS[item.type] ?? item.type}</Text>
          </View>
          <Pressable
            style={styles.deleteBtn}
            onPress={() =>
              Alert.alert('Remove this post?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => deleteAchievement.mutate(item.id) },
              ])
            }
          >
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  name: { color: theme.text, fontWeight: '800', fontSize: 13 },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
});
