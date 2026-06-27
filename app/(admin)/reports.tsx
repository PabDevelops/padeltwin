import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAdminReports, useAdminResolveReport } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminReports() {
  const { data: reports, isLoading } = useAdminReports('open');
  const resolve = useAdminResolveReport();

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={reports ?? []}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      ListEmptyComponent={<Text style={styles.empty}>No open reports.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.meta}>
            {item.target_type.toUpperCase()} · reported by {item.reporter_name ?? 'someone'}
          </Text>
          <Text style={styles.reason}>{item.reason}</Text>
          {item.details && <Text style={styles.details}>{item.details}</Text>}
          <Text style={styles.targetId}>target: {item.target_id}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.dismissBtn]}
              onPress={() => resolve.mutate({ reportId: item.id, status: 'dismissed' })}
            >
              <Text style={styles.btnText}>DISMISS</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.reviewedBtn]}
              onPress={() => resolve.mutate({ reportId: item.id, status: 'reviewed' })}
            >
              <Text style={styles.btnText}>MARK REVIEWED</Text>
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
  meta: { color: theme.accent, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  reason: { color: theme.text, fontWeight: '700', fontSize: 14 },
  details: { color: theme.textMuted, fontSize: 13 },
  targetId: { color: theme.textMuted, fontSize: 10, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  dismissBtn: { backgroundColor: theme.border },
  reviewedBtn: { backgroundColor: theme.accent },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
});
