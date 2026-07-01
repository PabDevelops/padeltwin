import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as d3 from 'd3-shape';
import { useSession } from '@/lib/useSession';
import {
  useProfile,
  useMyStats,
  useRecentResults,
  useMyUpcomingMatches,
  usePartnerRequests,
  useActivityFeed,
  useScrimIndex,
  scrimIndexLabel,
  useToggleVib,
  useDeletePost,
  type FeedItem,
} from '@/lib/queries';
import { theme, cardRadius } from '@/constants/theme';
import { ELO_PROVISIONAL_MATCHES } from '@/constants/elo';
import { MatchCard } from '@/components/MatchCard';
import { PostDetailModal } from '@/components/PostDetailModal';
import { PostRadialMenu } from '@/components/PostRadialMenu';
import type { PostCardData } from '@/lib/queries';
import type { MatchResultWithProfiles } from '@/types/database';
import { ACHIEVEMENT_LABELS, ACHIEVEMENT_ICONS } from '@/constants/achievements';

const { width: SW } = Dimensions.get('window');

function didWin(r: MatchResultWithProfiles, uid: string) {
  const inA = r.team_a_player1 === uid || r.team_a_player2 === uid;
  return (inA && r.winner === 'a') || (!inA && r.winner === 'b');
}

function scoreStr(r: MatchResultWithProfiles) {
  return r.sets.map((s) => `${s.a}-${s.b}`).join('  ');
}

function oppName(r: MatchResultWithProfiles, uid: string) {
  const inA = r.team_a_player1 === uid || r.team_a_player2 === uid;
  const rivals = inA
    ? [r.team_b_player1_profile, r.team_b_player2_profile]
    : [r.team_a_player1_profile, r.team_a_player2_profile];
  return rivals.map((p) => p?.full_name?.split(' ')[0] ?? 'Player').join(' & ');
}

function teamLabel(
  p1: MatchResultWithProfiles['team_a_player1_profile'],
  p2: typeof p1
) {
  return [p1?.full_name, p2?.full_name].filter(Boolean).join(' & ') || 'Players';
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const uid = session?.user.id;

  const { data: profile } = useProfile(uid);
  const { data: stats } = useMyStats(uid);
  const { data: results, isLoading: resultsLoading } = useRecentResults(uid, 20);
  const { data: upcoming } = useMyUpcomingMatches(uid);
  const { data: requests } = usePartnerRequests(uid);
  const { data: feed, isLoading: feedLoading } = useActivityFeed(uid, 20);
  const { data: scrimIndex } = useScrimIndex(uid);
  const toggleVib = useToggleVib();
  const deletePost = useDeletePost();

  const [viewingPost, setViewingPost] = useState<PostCardData | null>(null);
  const [radialPost, setRadialPost] = useState<PostCardData | null>(null);

  const pendingRequests = (requests ?? []).filter(
    (r) => r.status === 'pending' && r.to_id === uid
  ).length;

  const recentResults = results ?? [];
  const nextMatch = upcoming?.[0] ?? null;
  const activityFeed = feed ?? [];

  // ── Streak ──
  let streak = 0;
  let streakWin = true;
  for (let i = 0; i < recentResults.length; i++) {
    const w = didWin(recentResults[i], uid!);
    if (i === 0) { streakWin = w; streak = 1; }
    else if (w === streakWin) streak++;
    else break;
  }

  // ── Trend line (last 10 ELO points reconstructed) ──
  const elo = profile?.elo ?? 1200;
  const pts: number[] = [elo];
  if (uid) {
    for (const r of recentResults.slice(0, 9)) {
      pts.push(pts[pts.length - 1] + (didWin(r, uid) ? -15 : 15));
    }
  }
  pts.reverse();
  const hasChart = pts.length > 1;
  const minP = Math.min(...pts), maxP = Math.max(...pts), range = maxP - minP || 1;
  const CW = SW - 180, CH = 44;
  const n = pts.length - 1 || 1; // guard against /0
  const line = hasChart ? d3.line<number>()
    .x((_, i) => (i / n) * CW)
    .y((d) => CH - ((d - minP) / range) * (CH - 4) - 2)
    .curve(d3.curveMonotoneX)(pts) : null;
  const area = hasChart ? d3.area<number>()
    .x((_, i) => (i / n) * CW)
    .y0(CH).y1((d) => CH - ((d - minP) / range) * (CH - 4) - 2)
    .curve(d3.curveMonotoneX)(pts) : null;
  const diff = hasChart ? pts[pts.length - 1] - pts[0] : 0;
  const trendUp = diff >= 0;
  const trendColor = trendUp ? theme.accent : theme.danger;

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Player';
  const played = stats?.played ?? 0;
  const isCalibrating = played < ELO_PROVISIONAL_MATCHES;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => router.push('/(tabs)/profile')}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={18} color={theme.textMuted} />
            </View>
          )}
          <View>
            <Text style={styles.greeting}>Hey,</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
        </Pressable>

        <Pressable style={styles.bellBtn} onPress={() => router.push('/profile')}>
          <Ionicons name="notifications-outline" size={22} color={theme.text} />
          {pendingRequests > 0 && <View style={styles.bellDot} />}
        </Pressable>
      </View>

      {/* ── PS SCORE CARD ── */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreLabel}>PS SCORE</Text>
          <Text style={styles.scoreValue}>{elo}</Text>
          <View style={styles.scoreFooter}>
            {streak > 0 && (
              <View style={[styles.streakPill, { backgroundColor: streakWin ? `${theme.accent}22` : `${theme.danger}22`, borderColor: streakWin ? theme.accent : theme.danger }]}>
                <Text style={[styles.streakText, { color: streakWin ? theme.accent : theme.danger }]}>
                  {streak}{streakWin ? 'W' : 'L'} streak
                </Text>
              </View>
            )}
            {isCalibrating ? (
              <Text style={styles.calibratingText}>{played}/{ELO_PROVISIONAL_MATCHES} calibrating</Text>
            ) : (
              <Text style={styles.winRateText}>{stats?.winRate ?? 0}% win rate</Text>
            )}
          </View>
        </View>

        <View style={styles.scoreRight}>
          {line && area && (
            <Svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                  <Stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={area} fill="url(#grad)" />
              <Path d={line} stroke={trendColor} strokeWidth={2} fill="none" />
            </Svg>
          )}
          <Text style={[styles.trendLabel, { color: trendColor }]}>
            {trendUp ? '+' : ''}{diff} PS
          </Text>
          {scrimIndex != null && (
            <View style={styles.scrimRow}>
              <Text style={styles.scrimLabel}>FORM</Text>
              <Text style={[styles.scrimValue, { color: scrimIndex >= 7 ? theme.success : scrimIndex >= 5 ? theme.accent : theme.danger }]}>
                {scrimIndex.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── ACCIONES RÁPIDAS ── */}
      <View style={styles.quickActions}>
        <Pressable style={({ pressed }) => [styles.qaBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push('/create-match' as any)}>
          <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
          <Text style={styles.qaBtnText}>New match</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.qaBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push('/(tabs)/partners' as any)}>
          <Ionicons name="people-outline" size={20} color={theme.accent} />
          <Text style={styles.qaBtnText}>Find partner</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.qaBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push('/coaches' as any)}>
          <Ionicons name="school-outline" size={20} color={theme.accent} />
          <Text style={styles.qaBtnText}>Coaches</Text>
        </Pressable>
      </View>

      {/* ── PRÓXIMO PARTIDO ── */}
      {nextMatch && (
        <Pressable
          style={({ pressed }) => [styles.nextMatchCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push(`/match/${nextMatch.id}` as any)}
        >
          <View style={styles.nextMatchTop}>
            <View style={styles.nextMatchBadge}>
              <Text style={styles.nextMatchBadgeText}>NEXT MATCH</Text>
            </View>
            <Text style={styles.nextMatchDate}>
              {new Date(nextMatch.date_time).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
              {' · '}
              {new Date(nextMatch.date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.nextMatchLocation}>{nextMatch.location}</Text>
          <View style={styles.nextMatchFooter}>
            <Ionicons name="people-outline" size={13} color={theme.textMuted} />
            <Text style={styles.nextMatchPlayers}>
              {nextMatch.match_players?.length ?? 0}/{nextMatch.max_players ?? 4} players
            </Text>
          </View>
        </Pressable>
      )}

      {/* ── ÚLTIMOS PARTIDOS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECENT MATCHES</Text>
        {resultsLoading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} />
        ) : recentResults.length > 0 ? (
          <View style={styles.resultsList}>
            {recentResults.slice(0, 5).map((r) => {
              const win = didWin(r, uid!);
              return (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.75 }]}
                  onPress={() => router.push(`/match/${r.match_id || r.id}` as any)}
                >
                  <View style={[styles.resultDot, { backgroundColor: win ? theme.success : theme.danger }]} />
                  <Text style={[styles.resultBadge, { color: win ? theme.success : theme.danger }]}>
                    {win ? 'WIN' : 'LOSS'}
                  </Text>
                  <Text style={styles.resultOpp} numberOfLines={1}>{oppName(r, uid!)}</Text>
                  <Text style={styles.resultScore}>{scoreStr(r)}</Text>
                  <Text style={styles.resultDate}>
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/create-match' as any)}
          >
            <Ionicons name="tennisball-outline" size={24} color={theme.textMuted} />
            <Text style={styles.emptyText}>No matches recorded yet</Text>
            <Text style={styles.emptyAction}>Create your first match →</Text>
          </Pressable>
        )}
      </View>

      {/* ── ACTIVITY FEED ── */}
      {!feedLoading && activityFeed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVITY</Text>
          <View style={styles.feedList}>
            {activityFeed.map((item) => {
              if (item.kind === 'post') {
                return (
                  <View key={`post-${item.id}`} style={styles.feedPostWrap}>
                    <View style={styles.feedPostHeader}>
                      {item.profiles?.avatar_url ? (
                        <Image source={{ uri: item.profiles.avatar_url }} style={styles.feedAvatar} />
                      ) : (
                        <View style={[styles.feedAvatar, styles.feedAvatarPlaceholder]}>
                          <Ionicons name="person" size={12} color={theme.textMuted} />
                        </View>
                      )}
                      <Text style={styles.feedPostName}>{item.profiles?.full_name ?? 'Player'}</Text>
                      <Text style={styles.feedTime}>{timeAgo(item.created_at)}</Text>
                    </View>
                    <MatchCard
                      post={item}
                      posterId={item.profile_id}
                      width={SW - 32}
                      height={240}
                      vibCount={item.vibCount}
                      vibbedByMe={item.vibbedByMe}
                      onToggleVib={() => uid && toggleVib.mutate({ profileId: uid, itemType: 'post', itemId: item.id, currentlyVibbed: item.vibbedByMe })}
                      onPress={() => setViewingPost(item)}
                      onLongPress={() => setRadialPost(item)}
                    />
                  </View>
                );
              }

              if (item.kind === 'achievement') {
                const icon = ACHIEVEMENT_ICONS[item.type] || 'trophy';
                return (
                  <View key={`ach-${item.id}`} style={styles.feedRow}>
                    <View style={[styles.feedIconCircle, { backgroundColor: `${theme.accent}18`, borderColor: `${theme.accent}33` }]}>
                      <Ionicons name={icon as any} size={14} color={theme.accent} />
                    </View>
                    {item.profiles?.avatar_url ? (
                      <Image source={{ uri: item.profiles.avatar_url }} style={styles.feedAvatar} />
                    ) : (
                      <View style={[styles.feedAvatar, styles.feedAvatarPlaceholder]}>
                        <Ionicons name="person" size={12} color={theme.textMuted} />
                      </View>
                    )}
                    <View style={styles.feedInfo}>
                      <Text style={styles.feedName}>{item.profiles?.full_name ?? 'Player'}</Text>
                      <Text style={styles.feedSub}>{ACHIEVEMENT_LABELS[item.type] || 'New achievement'}</Text>
                    </View>
                    <Text style={styles.feedTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                );
              }

              // match_result
              const winTeam = item.winner === 'a'
                ? { p1: item.team_a_player1_profile, p2: item.team_a_player2_profile }
                : { p1: item.team_b_player1_profile, p2: item.team_b_player2_profile };
              return (
                <View key={`mr-${item.id}`} style={styles.feedRow}>
                  <View style={[styles.feedIconCircle, { backgroundColor: `${theme.success}18`, borderColor: `${theme.success}33` }]}>
                    <Ionicons name="tennisball" size={14} color={theme.success} />
                  </View>
                  {winTeam.p1?.avatar_url ? (
                    <Image source={{ uri: winTeam.p1.avatar_url }} style={styles.feedAvatar} />
                  ) : (
                    <View style={[styles.feedAvatar, styles.feedAvatarPlaceholder]}>
                      <Ionicons name="person" size={12} color={theme.textMuted} />
                    </View>
                  )}
                  <View style={styles.feedInfo}>
                    <Text style={styles.feedName}>{teamLabel(winTeam.p1, winTeam.p2)}</Text>
                    <Text style={styles.feedSub}>
                      won · {item.sets.map((s) => `${s.a}-${s.b}`).join(' ')}
                    </Text>
                  </View>
                  <Text style={styles.feedTime}>{timeAgo(item.created_at)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <PostDetailModal post={viewingPost} userId={uid} onClose={() => setViewingPost(null)} />
      <PostRadialMenu
        post={radialPost}
        isOwner={radialPost?.profile_id === uid}
        vibbedByMe={(activityFeed.find((i) => i.id === radialPost?.id) as any)?.vibbedByMe ?? false}
        onClose={() => setRadialPost(null)}
        onVib={() => {
          const item = activityFeed.find((i) => i.id === radialPost?.id);
          if (item && item.kind === 'post' && uid)
            toggleVib.mutate({ profileId: uid, itemType: 'post', itemId: item.id, currentlyVibbed: item.vibbedByMe });
          setRadialPost(null);
        }}
        onPin={() => setRadialPost(null)}
        onDelete={() => {
          if (radialPost) deletePost.mutate({ postId: radialPost.id, photoUrl: radialPost.photo_url });
          setRadialPost(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: theme.accent },
  avatarPlaceholder: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: theme.accent,
    backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center',
  },
  greeting: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  name: { fontSize: 18, fontFamily: 'Anton_400Regular', color: theme.text, letterSpacing: -0.3 },
  bellBtn: { padding: 4 },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.danger, borderWidth: 1.5, borderColor: theme.background,
  },

  // Score card
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 16,
  },
  scoreLeft: { flex: 1 },
  scoreLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '700', letterSpacing: 1.2 },
  scoreValue: { fontFamily: 'Anton_400Regular', fontSize: 56, color: theme.text, letterSpacing: -2, lineHeight: 60, marginTop: 2 },
  scoreFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  streakPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  streakText: { fontSize: 11, fontWeight: '800' },
  calibratingText: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  winRateText: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  scoreRight: { alignItems: 'flex-end', gap: 6, paddingTop: 4 },
  trendLabel: { fontSize: 12, fontWeight: '800', alignSelf: 'flex-end' },
  scrimRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  scrimLabel: { fontSize: 9, color: theme.textMuted, fontWeight: '700', letterSpacing: 0.8 },
  scrimValue: { fontSize: 16, fontFamily: 'Anton_400Regular', letterSpacing: -0.5 },

  // Next match
  nextMatchCard: {
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    padding: 16,
    gap: 6,
  },
  nextMatchTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextMatchBadge: { backgroundColor: `${theme.accent}22`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  nextMatchBadgeText: { color: theme.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  nextMatchDate: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
  nextMatchLocation: { color: theme.text, fontSize: 15, fontWeight: '700' },
  nextMatchFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  nextMatchPlayers: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 8 },
  qaBtn: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14,
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border,
  },
  qaBtnText: { color: theme.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Section
  section: { gap: 10 },
  sectionTitle: { fontSize: 10, color: theme.textMuted, fontWeight: '800', letterSpacing: 1.5 },

  // Empty state
  emptyCard: {
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border,
    borderStyle: 'dashed', paddingVertical: 28,
    alignItems: 'center', gap: 6,
  },
  emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  emptyAction: { color: theme.accent, fontSize: 12, fontWeight: '700' },

  // Results
  resultsList: {
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  resultDot: { width: 7, height: 7, borderRadius: 4 },
  resultBadge: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, width: 32 },
  resultOpp: { flex: 1, color: theme.text, fontSize: 13, fontWeight: '700' },
  resultScore: { color: theme.textMuted, fontSize: 12, fontWeight: '700', fontFamily: 'Anton_400Regular' },
  resultDate: { color: theme.textMuted, fontSize: 10, fontWeight: '600', width: 44, textAlign: 'right' },

  // Feed
  feedList: { gap: 1, backgroundColor: theme.card, borderRadius: cardRadius, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  feedPostWrap: { padding: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  feedPostHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedPostName: { flex: 1, color: theme.text, fontSize: 13, fontWeight: '700' },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  feedIconCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  feedAvatar: { width: 32, height: 32, borderRadius: 16 },
  feedAvatarPlaceholder: { backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  feedInfo: { flex: 1 },
  feedName: { color: theme.text, fontSize: 13, fontWeight: '700' },
  feedSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  feedTime: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },
});
