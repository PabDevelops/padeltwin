import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminDeleteMessage, useAdminSearchMessages } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminChats() {
  const [query, setQuery] = useState('');
  const { data: messages, isLoading } = useAdminSearchMessages(query);
  const deleteMessage = useAdminDeleteMessage();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search message content…"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      {isLoading && <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />}

      <FlatList
        data={messages ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10 }}
        ListEmptyComponent={query.trim().length > 0 && !isLoading ? <Text style={styles.empty}>No matches.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.sender_name ?? 'Player'}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
            <Pressable
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert('Delete this message?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMessage.mutate(item.id) },
                ])
              }
            >
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { padding: 20, paddingBottom: 12 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.text,
  },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  name: { color: theme.text, fontWeight: '800', fontSize: 12 },
  body: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 8 },
});
