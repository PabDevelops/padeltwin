import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/useSession';
import {
  useProfile,
  useMyPairs,
  usePairClubBoard,
  useMyPairClubs,
  useJoinPairClub,
} from '@/lib/queries';
import { ProBadge } from '@/components/ProBadge';
import { CoachBadge } from '@/components/CoachBadge';
import { theme, cardRadius } from '@/constants/theme';

const FREE_CLUB_LIMIT = 1;
const PRO_CLUB_LIMIT = 5;

export default function ClubLeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: pairs } = useMyPairs(userId);
  const activePair = pairs && pairs.length > 0
    ? [...pairs].sort((a, b) => b.elo - a.elo)[0]
    : null;

  const { data: myClubs } = useMyPairClubs(activePair?.id);
  const joinClub = useJoinPairClub();

  const [viewingClub, setViewingClub] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [clubInput, setClubInput] = useState(profile?.club ?? '');

  const activeClub = viewingClub ?? myClubs?.[0]?.club ?? null;
  const { data: leaderboard, isLoading } = usePairClubBoard(activeClub);

  const isPro = !!(activePair?.player_a?.is_pro || activePair?.player_b?.is_pro);
  const cap = isPro ? PRO_CLUB_LIMIT : FREE_CLUB_LIMIT;
  const joinedCount = myClubs?.length ?? 0;
  const atCap = joinedCount >= cap;

  const myPairId = activePair?.id;
  const myRank = leaderboard ? leaderboard.findIndex((p) => p.id === myPairId) : -1;
  const isCrowned = myRank === 0;

  function handleJoin() {
    if (!activePair || !clubInput.trim()) return;
    if (atCap) {
      Alert.alert('Limit reached', `${isPro ? 'Pro' : 'Free'} pairs can join up to ${cap} club${cap === 1 ? '' : 's'}.`);
      return;
    }
    joinClub.mutate(
      { pairId: activePair.id, club: clubInput.trim() },
      {
        onSuccess: () => {
          setViewingClub(clubInput.trim());
          setJoinModalOpen(false);
          setClubInput('');
        },
        onError: (e) => Alert.alert('Could not join club', e instanceof Error ? e.message : 'Try again.'),
      }
    );
  }

  // ── No pair ──────────────────────────────────────────────────────────────
  if (!activePair) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>KING OF THE{'\n'}COURT</Text>
          <Text style={styles.crown}>👑</Text>
        </View>
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>What is KOP?</Text>
          <Text style={styles.explainerBody}>
            The King of the Court (KOP) is the pair with the highest PS Score at a given club or court.
            Claim the crown by joining a club and outranking every other pair in it.
          </Text>
        </View>
        <View style={styles.noPairCard}>
          <Ionicons name="people-outline" size={32} color={theme.textMuted} />
          <Text style={styles.noPairText}>You need a ranked pair to contest the KOP crown.</Text>
        </View>
      </View>
    );
  }

  const pairName = `${activePair.player_a?.full_name?.split(' ')[0] ?? 'You'} & ${activePair.player_b?.full_name?.split(' ')[0] ?? 'Partner'}`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>KING OF THE{'\n'}COURT</Text>
          <Text style={styles.pairLabel}>{pairName}</Text>
        </View>
        <Text style={styles.crown}>{isCrowned && activeClub ? '👑' : '🏟️'}</Text>
      </View>

      {/* ── What is KOP ── */}
      <View style={styles.explainer}>
        <Text style={styles.explainerBody}>
          The pair with the highest PS Score at a club holds the{' '}
          <Text style={{ color: '#FFD700', fontWeight: '800' }}>👑 KOP Crown</Text>.
          Join a club to enter the rankings and knock the current champion off the throne.
        </Text>
      </View>

      {/* ── Crowned status ── */}
      {isCrowned && activeClub && (
        <View style={styles.crownedBanner}>
          <Text style={styles.crownedEmoji}>👑</Text>
          <View>
            <Text style={styles.crownedTitle}>YOU HOLD THE CROWN</Text>
            <Text style={styles.crownedSub}>at {activeClub}</Text>
          </View>
        </View>
      )}

      {/* ── Club tabs ── */}
      {(myClubs ?? []).length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubTabsRow}>
          {(myClubs ?? []).map((c) => (
            <Pressable
              key={c.id}
              style={[styles.clubTab, activeClub === c.club && styles.clubTabActive]}
              onPress={() => setViewingClub(c.club)}
            >
              <Text style={[styles.clubTabText, activeClub === c.club && styles.clubTabTextActive]}>
                {c.club}
              </Text>
            </Pressable>
          ))}
          {!atCap && (
            <Pressable style={styles.clubTabAdd} onPress={() => setJoinModalOpen(true)}>
              <Ionicons name="add" size={16} color={theme.accent} />
              <Text style={styles.clubTabAddText}>Join club</Text>
            </Pressable>
          )}
        </ScrollView>
      ) : (
        <Pressable style={styles.joinFirstBtn} onPress={() => setJoinModalOpen(true)}>
          <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
          <Text style={styles.joinFirstText}>Join your first club</Text>
        </Pressable>
      )}

      <Text style={styles.capNote}>{joinedCount}/{cap} clubs · {isPro ? 'Pro' : 'Free'} plan</Text>

      {/* ── Leaderboard ── */}
      {!activeClub ? null : isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
      ) : !leaderboard || leaderboard.length === 0 ? (
        <View style={styles.emptyBoard}>
          <Ionicons name="trophy-outline" size={32} color={theme.textMuted} />
          <Text style={styles.emptyBoardText}>No pairs here yet</Text>
          <Text style={styles.emptyBoardSub}>Be the first to join and claim the crown.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>{activeClub.toUpperCase()} RANKING</Text>
          <View style={styles.leaderboard}>
            {leaderboard.map((pair, index) => {
              const rank = index + 1;
              const isMine = pair.id === myPairId;
              const isChampion = rank === 1;
              return (
                <View
                  key={pair.id}
                  style={[
                    styles.leaderboardRow,
                    index < leaderboard.length - 1 && styles.leaderboardRowBorder,
                    isMine && styles.leaderboardRowMe,
                    isChampion && styles.leaderboardRowChampion,
                  ]}
                >
                  <Text style={styles.rankEmoji}>
                    {isChampion ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''}
                  </Text>
                  <Text style={[styles.rankNum, rank <= 3 && { color: theme.accent }]}>
                    {isChampion ? '' : `#${rank}`}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderboardName} numberOfLines={1}>
                      {pair.player_a?.full_name ?? 'Player'} & {pair.player_b?.full_name ?? 'Player'}
                    </Text>
                    {isMine && <Text style={styles.youLabel}>YOUR PAIR</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {pair.player_a?.is_pro || pair.player_b?.is_pro ? <ProBadge size="sm" /> : null}
                    {pair.player_a?.coach_status === 'approved' || pair.player_b?.coach_status === 'approved' ? <CoachBadge size="sm" /> : null}
                    <Text style={styles.leaderboardElo}>{pair.elo}</Text>
                    <Text style={styles.leaderboardPs}>PS</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Join club modal ── */}
      <Modal visible={joinModalOpen} transparent animationType="fade" onRequestClose={() => setJoinModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setJoinModalOpen(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Join a Club</Text>
            <Text style={styles.modalSub}>Enter the name of your padel club or court.</Text>
            <TextInput
              style={styles.modalInput}
              value={clubInput}
              onChangeText={setClubInput}
              placeholder="e.g. Club Pádel Madrid"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <Pressable
              style={[styles.modalBtn, (!clubInput.trim() || joinClub.isPending) && { opacity: 0.5 }]}
              onPress={handleJoin}
              disabled={!clubInput.trim() || joinClub.isPending}
            >
              {joinClub.isPending
                ? <ActivityIndicator size="small" color={theme.onAccent} />
                : <Text style={styles.modalBtnText}>JOIN CLUB</Text>
              }
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setJoinModalOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 14 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontFamily: 'Anton_400Regular', fontSize: 28, color: theme.text, letterSpacing: -0.5, lineHeight: 32 },
  pairLabel: { color: theme.accent, fontSize: 12, fontWeight: '700', marginTop: 4 },
  crown: { fontSize: 40 },

  // Explainer
  explainer: {
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border, padding: 14,
  },
  explainerTitle: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  explainerBody: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },

  // No pair
  noPairCard: {
    alignItems: 'center', gap: 10, paddingVertical: 40,
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border,
  },
  noPairText: { color: theme.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  // Crowned banner
  crownedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)', borderRadius: cardRadius,
    borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)', padding: 16,
  },
  crownedEmoji: { fontSize: 32 },
  crownedTitle: { color: '#FFD700', fontFamily: 'Anton_400Regular', fontSize: 16, letterSpacing: 0.5 },
  crownedSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Club tabs
  clubTabsRow: { gap: 8, paddingVertical: 2 },
  clubTab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
  },
  clubTabActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  clubTabText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  clubTabTextActive: { color: theme.onAccent },
  clubTabAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: `${theme.accent}55`, backgroundColor: `${theme.accent}10`,
  },
  clubTabAddText: { color: theme.accent, fontSize: 12, fontWeight: '700' },

  // Join first
  joinFirstBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: cardRadius,
    borderWidth: 1, borderColor: `${theme.accent}55`,
    borderStyle: 'dashed', backgroundColor: `${theme.accent}08`,
  },
  joinFirstText: { color: theme.accent, fontSize: 13, fontWeight: '700' },
  capNote: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },

  // Section label
  sectionLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '800', letterSpacing: 1.5 },

  // Leaderboard
  leaderboard: {
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  leaderboardRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  leaderboardRowMe: { backgroundColor: `${theme.accent}0D` },
  leaderboardRowChampion: { backgroundColor: 'rgba(255, 215, 0, 0.08)' },
  rankEmoji: { fontSize: 16, width: 22 },
  rankNum: { width: 24, color: theme.textMuted, fontWeight: '900', fontSize: 12 },
  leaderboardName: { color: theme.text, fontWeight: '700', fontSize: 13 },
  youLabel: { color: theme.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 1 },
  leaderboardElo: { color: theme.text, fontWeight: '900', fontSize: 14 },
  leaderboardPs: { color: theme.textMuted, fontSize: 9, fontWeight: '700' },

  // Empty board
  emptyBoard: {
    alignItems: 'center', gap: 8, paddingVertical: 40,
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border,
  },
  emptyBoardText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  emptyBoardSub: { color: theme.textMuted, fontSize: 12 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
  },
  modalTitle: { fontFamily: 'Anton_400Regular', fontSize: 22, color: theme.text },
  modalSub: { color: theme.textMuted, fontSize: 13 },
  modalInput: {
    backgroundColor: theme.background, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 12,
    color: theme.text, fontSize: 14,
  },
  modalBtn: {
    backgroundColor: theme.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnText: { color: theme.onAccent, fontWeight: '900', fontSize: 14, letterSpacing: 0.8 },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
});
