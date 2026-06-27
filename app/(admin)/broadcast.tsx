import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAdminBroadcastPush } from '@/lib/queries';
import { theme, buttonRadius } from '@/constants/theme';

const SEGMENTS: { value: 'all' | 'coaches' | 'pro'; label: string }[] = [
  { value: 'all', label: 'All players' },
  { value: 'coaches', label: 'Approved coaches' },
  { value: 'pro', label: 'Pro players' },
];

export default function AdminBroadcast() {
  const [segment, setSegment] = useState<'all' | 'coaches' | 'pro'>('all');
  const [zone, setZone] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const broadcast = useAdminBroadcastPush();

  function handleSend() {
    if (!title.trim() || !body.trim()) return;
    Alert.alert('Send this notification?', `Segment: ${segment}${zone ? ` · zone: ${zone}` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: () =>
          broadcast.mutate(
            { segment, title: title.trim(), body: body.trim(), zone: zone.trim() || undefined },
            {
              onSuccess: (count) => {
                Alert.alert('Sent', `Delivered to ${count} device${count === 1 ? '' : 's'}.`);
                setTitle('');
                setBody('');
              },
            }
          ),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>SEGMENT</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SEGMENTS.map((s) => (
          <Pressable
            key={s.value}
            style={[styles.chip, segment === s.value && styles.chipActive]}
            onPress={() => setSegment(s.value)}
          >
            <Text style={[styles.chipText, segment === s.value && styles.chipTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>ZONE FILTER (optional)</Text>
      <TextInput style={styles.input} value={zone} onChangeText={setZone} placeholder="e.g. London" placeholderTextColor={theme.textMuted} />

      <Text style={styles.label}>TITLE</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Notification title" placeholderTextColor={theme.textMuted} />

      <Text style={styles.label}>MESSAGE</Text>
      <TextInput
        style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        value={body}
        onChangeText={setBody}
        placeholder="Notification message"
        placeholderTextColor={theme.textMuted}
        multiline
      />

      <Pressable
        style={[styles.sendBtn, (!title.trim() || !body.trim() || broadcast.isPending) && { opacity: 0.5 }]}
        disabled={!title.trim() || !body.trim() || broadcast.isPending}
        onPress={handleSend}
      >
        <Text style={styles.sendBtnText}>SEND BROADCAST</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 8 },
  label: { color: theme.textMuted, fontWeight: '700', fontSize: 11, letterSpacing: 0.5, marginTop: 8 },
  input: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.text },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textMuted, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  sendBtn: { backgroundColor: theme.accent, borderRadius: buttonRadius, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
});
