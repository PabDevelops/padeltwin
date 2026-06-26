import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '@/lib/useSession';
import { useMessages, useSendMessage } from '@/lib/useRealtimeMessages';
import type { Message } from '@/types/database';
import { theme } from '@/constants/theme';

export default function ChatScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const { messages, loading } = useMessages(requestId);
  const sendMessage = useSendMessage();
  const [body, setBody] = useState('');

  function handleSend() {
    if (!body.trim() || !userId || !requestId) return;
    sendMessage.mutate({ requestId, senderId: userId, body: body.trim() });
    setBody('');
  }

  function renderItem({ item }: { item: Message }) {
    const isMine = item.sender_id === userId;
    return (
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextOther}>{item.body}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 8, padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hi!</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor={theme.textMuted}
          value={body}
          onChangeText={setBody}
          onSubmitEditing={handleSend}
        />
        <Pressable style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 10 },
  bubbleMine: { backgroundColor: theme.primary, alignSelf: 'flex-end' },
  bubbleOther: { backgroundColor: theme.card, alignSelf: 'flex-start' },
  bubbleTextMine: { color: '#fff' },
  bubbleTextOther: { color: theme.text },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 32 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: theme.border },
  input: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.card, color: theme.text },
  sendButton: { backgroundColor: theme.primary, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
