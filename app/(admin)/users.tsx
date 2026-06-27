import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAdminSearchProfiles, useAdminSetBanned, useAdminSetPro } from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';

export default function AdminUsers() {
  const [query, setQuery] = useState('');
  const { data: profiles, isLoading } = useAdminSearchProfiles(query);
  const setBanned = useAdminSetBanned();
  const setPro = useAdminSetPro();

  function handleBanPress(profileId: string, name: string, currentlyBanned: boolean) {
    if (currentlyBanned) {
      setBanned.mutate({ profileId, banned: false });
      return;
    }
    Alert.alert(`Ban ${name}?`, 'They will be signed out and unable to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ban', style: 'destructive', onPress: () => setBanned.mutate({ profileId, banned: true }) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or zone…"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      {isLoading && <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />}

      <FlatList
        data={profiles ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12 }}
        ListEmptyComponent={query.trim().length > 0 && !isLoading ? <Text style={styles.empty}>No matches.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.full_name ?? 'Player'} {item.is_banned ? '🚫' : ''} {item.is_pro ? '⭐' : ''}
              </Text>
              <Text style={styles.meta}>
                {item.zone ?? 'No zone'} · ELO {item.elo} · {item.coach_status}
              </Text>
              {item.is_banned && item.banned_reason && <Text style={styles.banReason}>Reason: {item.banned_reason}</Text>}
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, item.is_pro ? styles.btnActive : styles.btnInactive]}
                onPress={() => setPro.mutate({ profileId: item.id, isPro: !item.is_pro })}
              >
                <Text style={styles.btnText}>{item.is_pro ? 'UNSET PRO' : 'SET PRO'}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, item.is_banned ? styles.btnInactive : styles.banBtn]}
                onPress={() => handleBanPress(item.id, item.full_name ?? 'this player', item.is_banned)}
              >
                <Text style={styles.btnText}>{item.is_banned ? 'UNBAN' : 'BAN'}</Text>
              </Pressable>
            </View>
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
  card: { backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 8 },
  name: { color: theme.text, fontWeight: '800', fontSize: 14 },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  banReason: { color: theme.danger, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnActive: { backgroundColor: theme.accent },
  btnInactive: { backgroundColor: theme.border },
  banBtn: { backgroundColor: theme.danger },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 10, letterSpacing: 0.3 },
});
