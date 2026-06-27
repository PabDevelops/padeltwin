import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useMyLeagues, useCreateLeague, useJoinLeagueByCode, useProfile } from '@/lib/queries';
import { theme, buttonRadius, cardRadius } from '@/constants/theme';

export default function LeaguesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: leagues, isLoading } = useMyLeagues(userId);
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeagueByCode();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  function handleCreate() {
    if (!userId || !leagueName.trim()) return;
    createLeague.mutate(
      { name: leagueName.trim(), createdBy: userId },
      {
        onSuccess: (league) => {
          setCreateModalVisible(false);
          setLeagueName('');
          router.push(`/league/${league.id}` as any);
        },
        onError: (err: any) => Alert.alert('Could not create league', err.message ?? 'Try again.'),
      }
    );
  }

  function handleJoin() {
    if (!userId || !inviteCode.trim()) return;
    joinLeague.mutate(
      { inviteCode: inviteCode.trim(), profileId: userId },
      {
        onSuccess: (league) => {
          setJoinModalVisible(false);
          setInviteCode('');
          router.push(`/league/${league.id}` as any);
        },
        onError: (err: any) => Alert.alert('Could not join league', err.message ?? 'Check the code and try again.'),
      }
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.9 }]}
            onPress={() => {
              if (!profile?.is_pro) {
                Alert.alert('Pro feature', 'Creating a league is a Pro perk. Upgrade to Pro to start your own league.');
                return;
              }
              setCreateModalVisible(true);
            }}
          >
            <Ionicons name={profile?.is_pro ? 'add-circle' : 'lock-closed'} size={18} color={theme.onAccent} />
            <Text style={styles.actionButtonText}>{profile?.is_pro ? 'CREATE LEAGUE' : 'CREATE LEAGUE (PRO)'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButtonOutline, pressed && { opacity: 0.9 }]}
            onPress={() => setJoinModalVisible(true)}
          >
            <Ionicons name="enter" size={18} color={theme.text} />
            <Text style={styles.actionButtonOutlineText}>JOIN BY CODE</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>MY LEAGUES</Text>
        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 16 }} />
        ) : leagues && leagues.length > 0 ? (
          leagues.map((league) => (
            <Pressable
              key={league.id}
              style={({ pressed }) => [styles.leagueCard, pressed && { opacity: 0.9 }]}
              onPress={() => router.push(`/league/${league.id}` as any)}
            >
              <View style={styles.leagueCardIcon}>
                <Ionicons name="trophy" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leagueCardName}>{league.name}</Text>
                <Text style={styles.leagueCardCode}>CODE: {league.invite_code}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>You're not in any league yet. Create one or join with a friend's code.</Text>
        )}
      </ScrollView>

      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>NAME YOUR LEAGUE</Text>
            <TextInput
              style={styles.modalInput}
              value={leagueName}
              onChangeText={setLeagueName}
              placeholder="e.g. Edinburgh Padel Crew"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!leagueName.trim() || createLeague.isPending) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!leagueName.trim() || createLeague.isPending}
              >
                {createLeague.isPending ? <ActivityIndicator color={theme.onAccent} /> : <Text style={styles.modalConfirmText}>CREATE</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ENTER INVITE CODE</Text>
            <TextInput
              style={[styles.modalInput, { textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }]}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="ABC123"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setJoinModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!inviteCode.trim() || joinLeague.isPending) && { opacity: 0.5 }]}
                onPress={handleJoin}
                disabled={!inviteCode.trim() || joinLeague.isPending}
              >
                {joinLeague.isPending ? <ActivityIndicator color={theme.onAccent} /> : <Text style={styles.modalConfirmText}>JOIN</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    borderRadius: buttonRadius,
    paddingVertical: 14,
  },
  actionButtonText: { color: theme.onAccent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: buttonRadius,
    paddingVertical: 14,
  },
  actionButtonOutlineText: { color: theme.text, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '900', marginTop: 14, color: theme.accent, letterSpacing: 1.5 },
  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginTop: 10,
  },
  leagueCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 92, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueCardName: { color: theme.text, fontWeight: '800', fontSize: 15 },
  leagueCardCode: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  emptyText: { color: theme.textMuted, fontSize: 13, marginTop: 16, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: theme.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border },
  modalTitle: { color: theme.text, fontWeight: '900', fontSize: 13, letterSpacing: 1, marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#191922',
    color: theme.text,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: buttonRadius, borderWidth: 1, borderColor: theme.border },
  modalCancelText: { color: theme.textMuted, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  modalConfirmBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: buttonRadius, backgroundColor: theme.accent },
  modalConfirmText: { color: theme.onAccent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});
