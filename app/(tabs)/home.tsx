import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useProfile, useMyStats, useRecentResults, useLeaderboard, useMyUpcomingMatches, usePartnerRequests } from '@/lib/queries';
import type { MatchResultWithProfiles } from '@/types/database';
import { theme, cardRadius } from '@/constants/theme';

function didWin(result: MatchResultWithProfiles, userId: string) {
  const inTeamA = result.team_a_player1 === userId || result.team_a_player2 === userId;
  return (inTeamA && result.winner === 'a') || (!inTeamA && result.winner === 'b');
}

function opponents(result: MatchResultWithProfiles, userId: string) {
  const inTeamA = result.team_a_player1 === userId || result.team_a_player2 === userId;
  const rivals = inTeamA
    ? [result.team_b_player1_profile, result.team_b_player2_profile]
    : [result.team_a_player1_profile, result.team_a_player2_profile];
  return rivals.map((p) => p?.full_name ?? 'Player').join(' / ');
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: stats, isLoading: statsLoading } = useMyStats(userId);
  const { data: recentResults, isLoading: resultsLoading } = useRecentResults(userId, 8);
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(profile?.zone);
  const { data: upcomingMatches, isLoading: upcomingLoading } = useMyUpcomingMatches(userId);
  const { data: partnerRequests } = usePartnerRequests(userId);
  const pendingRequestsCount = (partnerRequests ?? []).filter((r) => r.status === 'pending' && r.to_id === userId).length;

  const animatedHeights = useRef(Array.from({ length: 8 }).map(() => new Animated.Value(8))).current;
  const miniAnimatedHeights = useRef(Array.from({ length: 4 }).map(() => new Animated.Value(4))).current;

  // Reconstruct player ELO history from recent results
  const currentElo = profile?.elo ?? 1200;
  const historyPoints: number[] = [currentElo];
  if (userId && recentResults) {
    let tempElo = currentElo;
    const delta = 15; // standard Elo step per match
    for (let i = 0; i < recentResults.length; i++) {
      const res = recentResults[i];
      const won = didWin(res, userId);
      if (won) {
        tempElo -= delta;
      } else {
        tempElo += delta;
      }
      historyPoints.push(tempElo);
    }
  }

  // Reverse so historyPoints flows chronologically (oldest to newest)
  historyPoints.reverse();

  // Pad to ensure we have exactly 8 elements for the chart bars
  while (historyPoints.length < 8) {
    const first = historyPoints[0] ?? 1200;
    historyPoints.unshift(first);
  }

  const last8Points = historyPoints.slice(-8);
  const minElo = Math.min(...last8Points);
  const maxElo = Math.max(...last8Points);
  const eloRange = maxElo - minElo;

  const minHeight = 8;
  const maxHeight = 54;
  const chartBars = last8Points.map((val, idx) => {
    let height = 24; // default height if no range/fluctuation exists
    if (eloRange > 0) {
      height = minHeight + ((val - minElo) / eloRange) * (maxHeight - minHeight);
    }
    const isUpward = idx > 0 && val > last8Points[idx - 1];
    return {
      height,
      color: isUpward ? theme.primary : '#22242E'
    };
  });

  // Calculate Streak
  let streak = 0;
  let streakType: 'W' | 'L' | null = null;
  if (userId && recentResults && recentResults.length > 0) {
    for (let i = 0; i < recentResults.length; i++) {
      const won = didWin(recentResults[i], userId);
      if (i === 0) {
        streakType = won ? 'W' : 'L';
        streak = 1;
      } else {
        const currentType = won ? 'W' : 'L';
        if (currentType === streakType) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // Find next upcoming match
  const nextMatch = upcomingMatches && upcomingMatches.length > 0 ? upcomingMatches[0] : null;
  
  // Calculate win probability for the next match
  let winProb = 50;
  if (profile && nextMatch) {
    const nextMatchPlayers = nextMatch.match_players ?? [];
    const otherElos = nextMatchPlayers
      .map((p: any) => p.profiles?.elo)
      .filter((e: any) => typeof e === 'number' && e > 0);
    if (otherElos.length > 0) {
      const avgOtherElo = otherElos.reduce((a: number, b: number) => a + b, 0) / otherElos.length;
      const diff = (profile.elo ?? 1200) - avgOtherElo;
      winProb = Math.max(20, Math.min(80, Math.round(50 + diff / 8)));
    }
  }

  // Dynamic Badges configuration
  // 1. Total Matches Badge
  const playedCount = stats?.played ?? 0;
  const isCalibrating = playedCount < 5;

  useEffect(() => {
    if (!isCalibrating) return;
    const animations = animatedHeights.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(anim, {
            toValue: 36,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 8,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
    });

    const miniAnimations = miniAnimatedHeights.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 80),
          Animated.timing(anim, {
            toValue: 28,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 4,
            duration: 400,
            useNativeDriver: false,
          }),
        ])
      );
    });

    Animated.parallel([...animations, ...miniAnimations]).start();
    return () => {
      animatedHeights.forEach((anim) => anim.stopAnimation());
      miniAnimatedHeights.forEach((anim) => anim.stopAnimation());
    };
  }, [isCalibrating]);

  let matchesBadgeText = '💤 INACTIVE';
  let matchesBadgeColor = 'rgba(110, 112, 126, 0.1)';
  let matchesBadgeTextColor = theme.textMuted;
  if (playedCount > 0 && playedCount < 5) {
    matchesBadgeText = '🌱 STARTING';
    matchesBadgeColor = 'rgba(46, 157, 255, 0.1)';
    matchesBadgeTextColor = theme.secondary;
  } else if (playedCount >= 5 && playedCount < 15) {
    matchesBadgeText = '🔥 ACTIVE';
    matchesBadgeColor = 'rgba(46, 157, 255, 0.1)';
    matchesBadgeTextColor = theme.secondary;
  } else if (playedCount >= 15) {
    matchesBadgeText = '⚡ VETERAN';
    matchesBadgeColor = 'rgba(255, 92, 0, 0.15)';
    matchesBadgeTextColor = theme.primary;
  }

  // 2. Win Rate Badge
  const winRate = stats?.winRate ?? 0;
  let winRateBadgeText = '⚔️ CONTENDING';
  let winRateBadgeColor = 'rgba(110, 112, 126, 0.1)';
  let winRateBadgeTextColor = theme.textMuted;
  if (playedCount > 0) {
    if (winRate >= 60) {
      winRateBadgeText = '🏆 DOMINATING';
      winRateBadgeColor = 'rgba(0, 230, 118, 0.1)';
      winRateBadgeTextColor = theme.success;
    } else if (winRate >= 45) {
      winRateBadgeText = '⚖️ BALANCED';
      winRateBadgeColor = 'rgba(46, 157, 255, 0.1)';
      winRateBadgeTextColor = theme.secondary;
    } else {
      winRateBadgeText = '⚠️ CHALLENGED';
      winRateBadgeColor = 'rgba(255, 92, 0, 0.1)';
      winRateBadgeTextColor = theme.primary;
    }
  }

  // 3. Zone Percentile Badge
  let percentileBadgeText = '⚓ CHALLENGER';
  let percentileBadgeColor = 'rgba(110, 112, 126, 0.1)';
  let percentileBadgeTextColor = theme.textMuted;
  if (isCalibrating) {
    percentileBadgeText = '⚓ CALIBRATING';
  } else if (leaderboard && profile) {
    const userIdx = leaderboard.findIndex((p) => p.id === userId);
    const topElo = leaderboard[0]?.elo ?? 1500;
    const userElo = profile.elo ?? 1200;
    const ratio = userElo / topElo;
    if (userIdx !== -1 && userIdx < 3) {
      percentileBadgeText = '👑 ELITE';
      percentileBadgeColor = 'rgba(255, 92, 0, 0.15)';
      percentileBadgeTextColor = theme.primary;
    } else if (ratio >= 0.85) {
      percentileBadgeText = '🎯 ADVANCED';
      percentileBadgeColor = 'rgba(255, 92, 0, 0.1)';
      percentileBadgeTextColor = theme.primary;
    } else if (ratio >= 0.70) {
      percentileBadgeText = '🛡️ COMPETITIVE';
      percentileBadgeColor = 'rgba(46, 157, 255, 0.1)';
      percentileBadgeTextColor = theme.secondary;
    }
  }

  // Calculate Zone Percentile or Rank Label
  let rankLabel = "TOP 25%";
  if (isCalibrating) {
    rankLabel = "UNRANKED";
  } else if (leaderboard && profile) {
    const userIdx = leaderboard.findIndex((p) => p.id === userId);
    if (userIdx !== -1) {
      rankLabel = `#${userIdx + 1} REG`;
    } else {
      const topElo = leaderboard[0]?.elo ?? 1500;
      const userElo = profile.elo ?? 1200;
      const ratio = userElo / topElo;
      if (ratio >= 0.95) rankLabel = "TOP 5%";
      else if (ratio >= 0.90) rankLabel = "TOP 10%";
      else if (ratio >= 0.80) rankLabel = "TOP 15%";
      else if (ratio >= 0.70) rankLabel = "TOP 25%";
      return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.welcomeTag}>ATHLETE TELEMETRY</Text>
        <Text style={styles.title}>HI{profile?.full_name ? `, ${profile.full_name.split(' ')[0].toUpperCase()}` : ''} 👋</Text>
      </View>

      {/* Partner Requests Alert Notification */}
      {pendingRequestsCount > 0 && (
        <Pressable 
          style={({ pressed }) => [
            styles.partnerAlertBanner,
            pressed && { opacity: 0.95 }
          ]}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.partnerAlertLeft}>
            <Ionicons name="people" size={18} color={theme.secondary} />
            <Text style={styles.partnerAlertText}>
              ⚡ {pendingRequestsCount} PENDING PARTNER REQUEST{pendingRequestsCount > 1 ? 'S' : ''}
            </Text>
          </View>
          <View style={styles.partnerAlertRight}>
            <Text style={styles.partnerAlertActionText}>REVIEW</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.secondary} style={{ marginLeft: 2 }} />
          </View>
        </Pressable>
      )}

      {/* Next Match Deployment Widget */}
      {upcomingLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 10 }} />
      ) : nextMatch ? (
        <Pressable 
          style={({ pressed }) => [
            styles.nextMatchCard,
            pressed && { opacity: 0.9 }
          ]}
          onPress={() => router.push(`/match/${nextMatch.id}`)}
        >
          <View style={styles.nextMatchHeader}>
            <Text style={styles.nextMatchTag}>⚡ ACTIVE DEPLOYMENT</Text>
            <View style={[styles.gridBadge, { backgroundColor: 'rgba(255, 92, 0, 0.15)', marginTop: 0 }]}>
              <Text style={[styles.gridBadgeText, { color: theme.primary }]}>LIVE TARGET</Text>
            </View>
          </View>
          <Text style={styles.nextMatchLocation}>{nextMatch.location}</Text>
          <Text style={styles.nextMatchTime}>
            📅 {new Date(nextMatch.date_time).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }).toUpperCase()} • {new Date(nextMatch.date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.nextMatchFooter}>
            <Text style={styles.nextMatchProbability}>
              WIN PROBABILITY: <Text style={{ color: '#fff', fontWeight: '900' }}>{winProb}%</Text>
            </Text>
            <Text style={styles.nextMatchRosterText}>
              ROSTER: <Text style={{ color: '#fff', fontWeight: '900' }}>{(nextMatch.match_players?.length ?? 0)}/{(nextMatch.max_players ?? 4)} ENLISTED</Text>
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.nextMatchCardEmpty}>
          <Text style={styles.nextMatchTagEmpty}>NO ACTIVE DEPLOYMENTS</Text>
          <Text style={styles.nextMatchTextEmpty}>All systems green. Roster clear. Scan the match feed to join a game or deploy a new match request.</Text>
          <View style={styles.emptyCardActions}>
            <Pressable 
              style={[styles.emptyCardButton, { backgroundColor: theme.primary }]} 
              onPress={() => router.push('/')}
            >
              <Ionicons name="search" size={13} color="#FFF" />
              <Text style={styles.emptyCardButtonText}>FIND A MATCH</Text>
            </Pressable>
            <Pressable 
              style={[styles.emptyCardButton, { borderColor: theme.border, borderWidth: 1 }]} 
              onPress={() => router.push('/create-match')}
            >
              <Ionicons name="add-circle" size={13} color={theme.textMuted} />
              <Text style={[styles.emptyCardButtonText, { color: theme.textMuted }]}>CREATE MATCH</Text>
            </Pressable>
          </View>
        </View>
      )} new match request.</Text>
        </View>
      )}

      {/* Main ELO Performance Widget */}
      <View style={styles.eloPerformanceCard}>
        <View style={styles.eloHeader}>
          <Text style={styles.widgetTag}>CURRENT RANKING</Text>
          <View style={isCalibrating ? { backgroundColor: 'rgba(110, 112, 126, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 } : styles.badgeOrange}>
            <Text style={isCalibrating ? { color: theme.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 } : styles.badgeOrangeText}>
              {isCalibrating ? 'CALIBRATING' : 'PRO LEVEL'}
            </Text>
          </View>
        </View>
        <View style={styles.eloContent}>
          {isCalibrating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48 }}>
              <Text style={[styles.eloHuge, { fontSize: 26, letterSpacing: -0.5, lineHeight: 48 }]}>CALIBRATING</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 30, paddingBottom: 6 }}>
                {miniAnimatedHeights.map((anim, index) => (
                  <Animated.View 
                    key={index} 
                    style={{
                      width: 5,
                      height: anim,
                      backgroundColor: theme.primary,
                      borderRadius: 2.5,
                    }}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.eloHuge}>{profile?.elo ?? '1200'}</Text>
          )}
          <Text style={styles.eloLabel}>
            {isCalibrating ? `CALIBRATION PHASE • ${playedCount}/5 MATCHES` : 'ATHLETE ELO RATING'}
          </Text>
        </View>
        <View style={styles.chartSimulation}>
          {/* Stylized telemetry bar chart representing ELO fluctuations */}
          {chartBars.map((bar, index) => {
            const barHeight = isCalibrating ? animatedHeights[index] : bar.height;
            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.chartBar, 
                  { 
                    height: barHeight, 
                    backgroundColor: isCalibrating ? 'rgba(255, 92, 0, 0.4)' : bar.color 
                  }
                ]} 
              />
            );
          })}
        </View>
      </View>

      {/* Stats Detail Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.gridCard}>
          <Text style={styles.gridCardLabel}>TOTAL MATCHES</Text>
          {statsLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={styles.gridCardValue}>{stats?.played ?? 0}</Text>
          )}
          <View style={[styles.gridBadge, { backgroundColor: matchesBadgeColor }]}>
            <Text style={[styles.gridBadgeText, { color: matchesBadgeTextColor }]}>{matchesBadgeText}</Text>
          </View>
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.gridCardLabel}>WINNING RATE</Text>
          {statsLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={styles.gridCardValue}>{stats?.winRate ?? 0}%</Text>
          )}
          <View style={[styles.gridBadge, { backgroundColor: winRateBadgeColor }]}>
            <Text style={[styles.gridBadgeText, { color: winRateBadgeTextColor }]}>{winRateBadgeText}</Text>
          </View>
        </View>
      </View>

      {/* Performance Insights - Stats Grid Row 2 */}
      <View style={[styles.statsGrid, { marginTop: -4 }]}>
        <View style={styles.gridCard}>
          <Text style={styles.gridCardLabel}>CURRENT STREAK</Text>
          {resultsLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={styles.gridCardValue}>{streak}{streakType ?? 'W'}</Text>
          )}
          <View 
            style={[
              styles.gridBadge, 
              { 
                backgroundColor: streakType === 'W' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 59, 48, 0.1)' 
              }
            ]}
          >
            <Text 
              style={[
                styles.gridBadgeText, 
                { 
                  color: streakType === 'W' ? theme.success : theme.danger 
                }
              ]}
            >
              {streakType === 'W' ? '📈 WINNING' : '📉 ADJUSTING'}
            </Text>
          </View>
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.gridCardLabel}>ZONE PERCENTILE</Text>
          {leaderboardLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={styles.gridCardValue}>{rankLabel}</Text>
          )}
          <View style={[styles.gridBadge, { backgroundColor: percentileBadgeColor }]}>
            <Text style={[styles.gridBadgeText, { color: percentileBadgeTextColor }]}>{percentileBadgeText}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>RECENT MATCH TICKERS</Text>
      {resultsLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} />
      ) : recentResults && recentResults.length > 0 ? (
        recentResults.slice(0, 5).map((r) => {
          const win = didWin(r, userId!);
          return (
            <View key={r.id} style={styles.resultCard}>
              <View style={styles.resultRow}>
                <View style={styles.opponentWrapper}>
                  <Text style={styles.vsTag}>VS</Text>
                  <Text style={styles.resultOpponent} numberOfLines={1}>
                    {opponents(r, userId!).toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.resultBadge, win ? styles.winBadge : styles.lossBadge]}>
                  <Text style={[styles.resultBadgeText, win ? styles.winText : styles.lossText]}>
                    {win ? 'WIN' : 'LOSS'}
                  </Text>
                </View>
              </View>
              <View style={styles.resultCardFooter}>
                <View style={styles.setScoresRow}>
                  {r.sets.map((s, idx) => (
                    <View key={idx} style={[styles.scoreBox, win ? styles.scoreBoxWin : null]}>
                      <Text style={[styles.scoreText, win ? styles.scoreTextWin : null]}>{s.a}-{s.b}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.matchTypeTag}>DOUBLES MATCH</Text>
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No recorded match results found in your zone.</Text>
      )}

      <Text style={styles.sectionTitle}>LEADERBOARD {profile?.zone ? `• ${profile.zone.toUpperCase()}` : ''}</Text>
      {leaderboardLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.leaderboardContainer}>
          {leaderboard?.map((p, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const rankStr = rank < 10 ? `0${rank}` : `${rank}`;
            return (
              <View key={p.id} style={[styles.leaderboardRow, rank === leaderboard.length && { borderBottomWidth: 0 }]}>
                <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>{rankStr}</Text>
                <View style={styles.playerAvatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{(p.full_name ?? '?').slice(0, 1).toUpperCase()}</Text>
                </View>
                <Text style={styles.leaderboardName} numberOfLines={1}>
                  {(p.full_name ?? 'Player').toUpperCase()}
                </Text>
                <Text style={styles.leaderboardElo}>{p.elo} <Text style={{ fontSize: 9, color: theme.textMuted }}>ELO</Text></Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: theme.background },
  container: { padding: 20, gap: 16, paddingBottom: 32 },
  headerContainer: { marginBottom: 4, marginTop: 12 },
  welcomeTag: { fontSize: 10, fontWeight: '900', color: theme.primary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: theme.text, letterSpacing: -0.5 },
  eloPerformanceCard: {
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    position: 'relative',
    overflow: 'hidden',
  },
  eloHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  widgetTag: { fontSize: 10, fontWeight: '800', color: theme.textMuted, letterSpacing: 1 },
  badgeOrange: { backgroundColor: 'rgba(255, 92, 0, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeOrangeText: { color: theme.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  eloContent: { marginTop: 14, marginBottom: 8 },
  eloHuge: { fontSize: 44, fontWeight: '900', color: theme.text, letterSpacing: -1 },
  eloLabel: { fontSize: 9, fontWeight: '800', color: theme.textMuted, letterSpacing: 1, marginTop: 2 },
  chartSimulation: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60, marginTop: 10, alignSelf: 'stretch', opacity: 0.8 },
  chartBar: { flex: 1, backgroundColor: '#22242E', borderRadius: 3, minHeight: 4 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'flex-start',
  },
  gridCardLabel: { fontSize: 9, fontWeight: '900', color: theme.textMuted, letterSpacing: 1, marginBottom: 8 },
  gridCardValue: { fontSize: 24, fontWeight: '900', color: theme.text, letterSpacing: -0.5 },
  gridBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gridBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '900', marginTop: 14, color: theme.primary, letterSpacing: 1.5 },
  resultCard: { 
    backgroundColor: theme.card, 
    borderRadius: cardRadius, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: theme.border 
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opponentWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  vsTag: { fontSize: 9, fontWeight: '900', color: theme.primary, backgroundColor: 'rgba(255, 92, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  resultOpponent: { fontSize: 14, fontWeight: '800', color: theme.text, letterSpacing: 0.2 },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  winBadge: { backgroundColor: 'rgba(0, 230, 118, 0.1)', borderWidth: 1, borderColor: theme.success },
  lossBadge: { backgroundColor: 'rgba(110, 112, 126, 0.1)', borderWidth: 1, borderColor: theme.border },
  resultBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  winText: { color: theme.success },
  lossText: { color: theme.textMuted },
  resultCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
  setScoresRow: { flexDirection: 'row', gap: 6 },
  scoreBox: { backgroundColor: '#1E1E28', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border },
  scoreBoxWin: { backgroundColor: 'rgba(0, 230, 118, 0.1)', borderColor: theme.success },
  scoreText: { fontSize: 12, fontWeight: '800', color: theme.textMuted },
  scoreTextWin: { color: theme.success },
  matchTypeTag: { fontSize: 9, fontWeight: '900', color: theme.textMuted, letterSpacing: 0.5 },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 8, fontSize: 13 },
  leaderboardContainer: {
    backgroundColor: theme.card,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rankText: { fontSize: 13, fontWeight: '900', color: theme.textMuted, width: 24, marginRight: 8 },
  rankTextTop: { color: theme.primary },
  playerAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#22242E', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: theme.border },
  avatarLetter: { fontSize: 11, fontWeight: '900', color: theme.text },
  leaderboardName: { flex: 1, color: theme.text, fontWeight: '800', fontSize: 13, letterSpacing: 0.2 },
  leaderboardElo: { color: theme.text, fontWeight: '900', fontSize: 13 },
  nextMatchCard: { 
    backgroundColor: theme.card, 
    borderRadius: cardRadius, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderLeftWidth: 4, 
    borderLeftColor: theme.primary,
    marginBottom: 4,
  },
  nextMatchCardEmpty: { 
    backgroundColor: theme.card, 
    borderRadius: cardRadius, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: theme.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    opacity: 0.8,
  },
  nextMatchHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  nextMatchTag: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: theme.primary, 
    letterSpacing: 2 
  },
  nextMatchTagEmpty: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: theme.textMuted, 
    letterSpacing: 2,
    marginBottom: 4
  },
  nextMatchLocation: { 
    fontSize: 15, 
    fontWeight: '900', 
    color: theme.text, 
    textTransform: 'uppercase',
    letterSpacing: 0.2
  },
  nextMatchTime: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: theme.textMuted, 
    marginTop: 4 
  },
  nextMatchTextEmpty: { 
    fontSize: 12, 
    color: theme.textMuted, 
    textAlign: 'center', 
    lineHeight: 18, 
    paddingHorizontal: 8 
  },
  nextMatchFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: theme.border, 
    paddingTop: 10 
  },
  nextMatchProbability: { 
    fontSize: 9, 
    fontWeight: '900', 
    color: theme.secondary, 
    letterSpacing: 0.5 
  },
  nextMatchRosterText: { 
    fontSize: 9, 
    fontWeight: '900', 
    color: theme.textMuted, 
    letterSpacing: 0.5 
  },
  chartLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 16, 22, 0.85)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22242E',
  },
  chartLockText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.primary,
    letterSpacing: 1.2,
  },
});
