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
  const [inputFocused, setInputFocused] = useState(false);

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
        <ActivityIndicator color={theme.accent} size="large" />
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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>NO MESSAGES YET. START THE CONVERSATION!</Text>}
      />
      <View style={[styles.inputRow, inputFocused && styles.inputRowActive]}>
        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          placeholder="TYPE MESSAGE..."
          placeholderTextColor={theme.textMuted}
          value={body}
          onChangeText={setBody}
          onSubmitEditing={handleSend}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        <Pressable 
          style={({ pressed }) => [
            styles.sendButton, 
            pressed && { scale: 0.96 } as any,
            !body.trim() && styles.sendButtonDisabled
          ]} 
          onPress={handleSend}
          disabled={!body.trim()}
        >
          <Text style={styles.sendButtonText}>SEND</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  listContent: { gap: 12, padding: 20 },
  bubble: { 
    maxWidth: '82%', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  bubbleMine: { 
    backgroundColor: theme.primary, 
    alignSelf: 'flex-end',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 2,
  },
  bubbleOther: { 
    backgroundColor: theme.card, 
    alignSelf: 'flex-start',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleTextMine: { color: theme.onAccent, fontSize: 14, fontWeight: '700', lineHeight: 18, letterSpacing: 0.2 },
  bubbleTextOther: { color: theme.text, fontSize: 14, fontWeight: '700', lineHeight: 18, letterSpacing: 0.2 },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 40, fontSize: 11,  letterSpacing: 1.5, textTransform: 'uppercase'},
  inputRow: { 
    flexDirection: 'row', 
    gap: 10, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderTopWidth: 1, 
    borderTopColor: theme.border,
    backgroundColor: '#0B0C10'
  },
  inputRowActive: {
    borderTopColor: theme.borderActive,
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    backgroundColor: theme.card, 
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputFocused: {
    borderColor: theme.borderActive,
    backgroundColor: '#1B1C24',
  },
  sendButton: { 
    backgroundColor: theme.primary, 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#22242E',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: { 
    color: '#0B0C10', 
     
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',},
});
