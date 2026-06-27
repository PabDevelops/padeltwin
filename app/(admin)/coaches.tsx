import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAdminPendingCoaches, useAdminSetCoachStatus } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminCoaches() {
  const { data: coaches, isLoading } = useAdminPendingCoaches();
  const setStatus = useAdminSetCoachStatus();

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={coaches ?? []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      ListEmptyComponent={<Text style={styles.empty}>No pending coach applications.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.full_name ?? 'Player'}</Text>
          {item.coach_bio && <Text style={styles.bio}>{item.coach_bio}</Text>}
          <View style={styles.metaRow}>
            {item.coach_hourly_rate != null && <Text style={styles.meta}>£{item.coach_hourly_rate}/hr</Text>}
            {item.coach_years_experience != null && <Text style={styles.meta}>{item.coach_years_experience} yrs exp</Text>}
          </View>
          {item.coach_specialties && <Text style={styles.meta}>{item.coach_specialties}</Text>}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.approveBtn]}
              onPress={() => setStatus.mutate({ profileId: item.id, status: 'approved' })}
            >
              <Text style={styles.btnText}>APPROVE</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.rejectBtn]}
              onPress={() => setStatus.mutate({ profileId: item.id, status: 'rejected' })}
            >
              <Text style={styles.btnText}>REJECT</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 6 },
  name: { color: theme.text, fontWeight: '800', fontSize: 15 },
  bio: { color: theme.text, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 12 },
  meta: { color: theme.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: theme.accent },
  rejectBtn: { backgroundColor: theme.danger },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});
