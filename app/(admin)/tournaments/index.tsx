import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdminCreateTournament, useAdminTournaments } from '@/lib/queries';
import { theme, cardRadius, buttonRadius } from '@/constants/theme';
import type { TournamentFormat } from '@/types/database';

export default function AdminTournaments() {
  const router = useRouter();
  const { data: tournaments, isLoading } = useAdminTournaments();
  const createTournament = useAdminCreateTournament();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('round_robin');

  function handleCreate() {
    if (!name.trim()) return;
    createTournament.mutate(
      { name: name.trim(), format, zone: zone.trim() || undefined },
      {
        onSuccess: () => {
          setModalVisible(false);
          setName('');
          setZone('');
        },
      }
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Pressable style={styles.createBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.createBtnText}>+ NEW TOURNAMENT</Text>
      </Pressable>

      {isLoading && <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />}

      <FlatList
        data={tournaments ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>No tournaments yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(admin)/tournaments/${item.id}` as any)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.format === 'bracket' ? 'Bracket' : 'Round robin'} · {item.status} {item.zone ? `· ${item.zone}` : ''}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: 10 }}>
            <Text style={styles.modalTitle}>NEW TOURNAMENT</Text>
            <Text style={styles.label}>NAME</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Summer Cup" placeholderTextColor={theme.textMuted} />
            <Text style={styles.label}>ZONE (optional)</Text>
            <TextInput style={styles.input} value={zone} onChangeText={setZone} placeholder="e.g. London" placeholderTextColor={theme.textMuted} />
            <Text style={styles.label}>FORMAT</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['round_robin', 'bracket'] as TournamentFormat[]).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.formatChip, format === f && styles.formatChipActive]}
                  onPress={() => setFormat(f)}
                >
                  <Text style={[styles.formatChipText, format === f && styles.formatChipTextActive]}>
                    {f === 'round_robin' ? 'Round robin' : 'Bracket'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!name.trim() || createTournament.isPending) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!name.trim() || createTournament.isPending}
              >
                <Text style={styles.modalConfirmText}>CREATE</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  createBtn: { margin: 20, marginBottom: 4, backgroundColor: theme.accent, borderRadius: buttonRadius, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 16 },
  cardTitle: { color: theme.text, fontWeight: '800', fontSize: 15 },
  cardMeta: { color: theme.textMuted, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { color: theme.text, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  label: { color: theme.textMuted, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  input: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.text },
  formatChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  formatChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  formatChipText: { color: theme.textMuted, fontWeight: '700', fontSize: 12 },
  formatChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  modalCancelText: { color: theme.textMuted, fontWeight: '800', fontSize: 12 },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accent },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
