import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAdminDeleteLeague, useAdminLeagueMembers, useAdminLeagues } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminLeagues() {
  const { data: leagues, isLoading } = useAdminLeagues();
  const deleteLeague = useAdminDeleteLeague();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const { data: members, isLoading: membersLoading } = useAdminLeagueMembers(selectedLeagueId ?? undefined);
  const selectedLeague = leagues?.find((l) => l.id === selectedLeagueId);

  if (isLoading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={leagues ?? []}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>No leagues yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setSelectedLeagueId(item.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.member_count} members · created by {item.creator_name ?? 'someone'} · code {item.invite_code}
              </Text>
            </View>
            <Pressable
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert('Delete this league?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteLeague.mutate(item.id) },
                ])
              }
            >
              <Text style={styles.deleteBtnText}>DELETE</Text>
            </Pressable>
          </Pressable>
        )}
      />

      <Modal visible={!!selectedLeagueId} transparent animationType="fade" onRequestClose={() => setSelectedLeagueId(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: 10 }}>
            <Text style={styles.modalTitle}>{selectedLeague?.name?.toUpperCase()}</Text>
            {membersLoading && <ActivityIndicator color={theme.accent} />}
            {(members ?? []).map((m) => (
              <View key={m.profile_id} style={styles.memberRow}>
                <Text style={styles.memberName}>{m.full_name ?? 'Player'}</Text>
                <Text style={styles.memberElo}>{m.elo} ELO</Text>
              </View>
            ))}
            <Pressable style={styles.closeBtn} onPress={() => setSelectedLeagueId(null)}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 10 },
  name: { color: theme.text, fontWeight: '800', fontSize: 14 },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  deleteBtn: { backgroundColor: theme.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  deleteBtnText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { color: theme.text, fontWeight: '900', fontSize: 14, letterSpacing: 0.5, marginBottom: 4 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  memberName: { color: theme.text, fontSize: 13 },
  memberElo: { color: theme.accent, fontWeight: '700', fontSize: 12 },
  closeBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  closeBtnText: { color: theme.textMuted, fontWeight: '800', fontSize: 12 },
});
