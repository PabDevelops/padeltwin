import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/useSession';
import { useProfile, useMyPairs, useCountryLeagueBoard } from '@/lib/queries';
import type { PairWithProfiles } from '@/types/database';
import { divisionFromPairElo, divisionProgress, type PairDivision } from '@/lib/pairDivisions';
import { theme, cardRadius } from '@/constants/theme';

// ── Division config ──────────────────────────────────────────────────────────
const DIVISIONS: { name: PairDivision; min: number; color: string; icon: string }[] = [
  { name: 'Circuit Apex',      min: 1800, color: '#C6FF33', icon: 'trophy'        },
  { name: 'Challenger Series', min: 1500, color: '#FBBF24', icon: 'flash'         },
  { name: 'Open Division',     min: 1200, color: '#38BDF8', icon: 'tennisball'    },
  { name: 'Club Qualifier',    min: 1000, color: '#6EE7B7', icon: 'ribbon'        },
  { name: 'Rookie Stage',      min:    0, color: '#6B7280', icon: 'star-outline'  },
];

function divisionConfig(name: PairDivision) {
  return DIVISIONS.find((d) => d.name === name) ?? DIVISIONS[4];
}

export default function LeaguesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: pairs, isLoading } = useMyPairs(userId);
  const activePair = pairs && pairs.length > 0
    ? [...pairs].sort((a, b) => b.elo - a.elo)[0]
    : null;

  const country = profile?.country ?? undefined;
  const { data: countryBoard } = useCountryLeagueBoard(country);
  const myPairIds = new Set((pairs ?? []).map((p) => p.id));

  const [howOpen, setHowOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  // ── No pair yet ──────────────────────────────────────────────────────────
  if (!activePair) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>LEAGUES</Text>

        {/* How it works */}
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>How leagues work</Text>
          <Text style={styles.explainerBody}>
            PadelTwin ranks pairs, not individuals. Declare a fixed pair with an accepted partner
            and your pair is automatically placed in your country's league — no joining required.
            Win matches to earn PS Score and climb through 5 divisions, from Rookie Stage all the
            way up to Circuit Apex.
          </Text>
        </View>

        {/* Division ladder preview */}
        <Text style={styles.sectionLabel}>THE 5 DIVISIONS</Text>
        <View style={styles.ladderCard}>
          {DIVISIONS.map((d, i) => (
            <View key={d.name} style={[styles.ladderRow, i < DIVISIONS.length - 1 && styles.ladderRowBorder]}>
              <View style={[styles.ladderDot, { backgroundColor: d.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.ladderName, { color: d.color }]}>{d.name}</Text>
                <Text style={styles.ladderMin}>{d.min === 0 ? 'Starting division' : `${d.min}+ PS`}</Text>
              </View>
              <Ionicons name={d.icon as any} size={18} color={d.color} style={{ opacity: 0.7 }} />
            </View>
          ))}
        </View>

        <Pressable style={styles.ctaBtn} onPress={() => router.push('/pairs' as any)}>
          <Ionicons name="people" size={18} color={theme.onAccent} />
          <Text style={styles.ctaBtnText}>DECLARE A PAIR</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Has a pair ───────────────────────────────────────────────────────────
  const dp = divisionProgress(activePair.elo);
  const cfg = divisionConfig(dp.division);
  const pairName = `${activePair.player_a?.full_name?.split(' ')[0] ?? 'You'} & ${activePair.player_b?.full_name?.split(' ')[0] ?? 'Partner'}`;

  // Country board: top 3 + contextual rows around user position
  const myRank = countryBoard ? countryBoard.findIndex((p) => myPairIds.has(p.id)) : -1;
  // Build preview: top 3, then if user is below rank 4: one above + user + one below (with gap marker)
  const previewRows: Array<PairWithProfiles | null> = countryBoard
    ? (() => {
        const top3 = countryBoard.slice(0, 3);
        if (myRank < 0 || myRank < 3) return top3;
        const above = myRank > 0 ? countryBoard[myRank - 1] : null;
        const user = countryBoard[myRank];
        const below = myRank < countryBoard.length - 1 ? countryBoard[myRank + 1] : null;
        const showGap = myRank > 3;
        return [...top3, ...(showGap ? [null] : []), ...(above && myRank > 3 ? [above] : []), user, ...(below ? [below] : [])];
      })()
    : [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>LEAGUES</Text>

      {/* ── Division hero ── */}
      <View style={[styles.divisionHero, { borderColor: cfg.color + '44', backgroundColor: cfg.color + '0D' }]}>
        <View style={[styles.divisionIconCircle, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
          <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.divisionHeroPair}>{pairName}</Text>
          <Text style={[styles.divisionHeroName, { color: cfg.color }]}>{dp.division.toUpperCase()}</Text>
          <Text style={styles.divisionHeroElo}>{activePair.elo} PS</Text>
        </View>
        {dp.nextDivision && (
          <View style={styles.divisionHeroRight}>
            <Text style={styles.divisionHeroToNext}>{dp.eloToNext}</Text>
            <Text style={styles.divisionHeroToNextLabel}>to next</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {dp.nextDivision && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(dp.progress * 100)}%`, backgroundColor: cfg.color }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>{dp.division}</Text>
            <Text style={[styles.progressLabel, { color: cfg.color }]}>{dp.nextDivision} →</Text>
          </View>
        </View>
      )}

      {/* ── Division ladder ── */}
      <Text style={styles.sectionLabel}>DIVISIONS</Text>
      <View style={styles.ladderCard}>
        {DIVISIONS.map((d, i) => {
          const isActive = d.name === dp.division;
          const dest = country
            ? `/leagues/country?value=${encodeURIComponent(country)}&division=${encodeURIComponent(d.name)}`
            : `/leagues/country?division=${encodeURIComponent(d.name)}`;
          return (
            <Pressable
              key={d.name}
              onPress={() => router.push(dest as any)}
              style={({ pressed }) => [
                styles.ladderRow,
                i < DIVISIONS.length - 1 && styles.ladderRowBorder,
                isActive && { backgroundColor: d.color + '12' },
                pressed && { opacity: 0.7 },
              ]}
            >
              {isActive
                ? <Ionicons name="chevron-forward" size={14} color={d.color} style={{ width: 18 }} />
                : <View style={[styles.ladderDot, { backgroundColor: d.color, opacity: 0.4 }]} />
              }
              <View style={{ flex: 1 }}>
                <Text style={[styles.ladderName, { color: isActive ? d.color : theme.textMuted }]}>{d.name}</Text>
                <Text style={styles.ladderMin}>{d.min === 0 ? 'Starting division' : `${d.min}+ PS`}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={isActive ? d.color : theme.border} />
            </Pressable>
          );
        })}
      </View>

      {/* ── Country league preview ── */}
      {country && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>{country.toUpperCase()} LEAGUE</Text>
            <Pressable onPress={() => router.push(`/leagues/country?value=${encodeURIComponent(country)}&division=${encodeURIComponent(dp.division)}` as any)}>
              <Text style={styles.seeAll}>MY DIVISION →</Text>
            </Pressable>
          </View>
          <View style={styles.rankCard}>
            {previewRows.length === 0 ? (
              <Text style={styles.emptySmall}>No pairs ranked yet</Text>
            ) : (
              previewRows.map((pair, i) => {
                if (pair === null) {
                  return (
                    <View key={`gap-${i}`} style={[styles.rankRow, styles.rankRowBorder]}>
                      <Text style={[styles.rankNum, { color: theme.textMuted }]}>···</Text>
                    </View>
                  );
                }
                const rank = (countryBoard ?? []).findIndex((p) => p.id === pair.id) + 1;
                const isMine = myPairIds.has(pair.id);
                const div = divisionFromPairElo(pair.elo);
                const divC = divisionConfig(div).color;
                return (
                  <View key={pair.id} style={[styles.rankRow, i < previewRows.length - 1 && styles.rankRowBorder, isMine && styles.rankRowMe]}>
                    <Text style={[styles.rankNum, rank <= 3 && { color: theme.accent }]}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankPairName} numberOfLines={1}>
                        {pair.player_a?.full_name?.split(' ')[0] ?? 'P'} & {pair.player_b?.full_name?.split(' ')[0] ?? 'P'}
                        {isMine ? '  YOU' : ''}
                      </Text>
                      <Text style={[styles.rankDiv, { color: divC }]}>{div}</Text>
                    </View>
                    <Text style={styles.rankElo}>{pair.elo} PS</Text>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {/* ── KOP teaser ── */}
      <Pressable style={styles.kopTeaser} onPress={() => router.push('/club-leaderboard' as any)}>
        <View style={styles.kopTeaserLeft}>
          <Text style={styles.kopTeaserCrown}>👑</Text>
          <View>
            <Text style={styles.kopTeaserTitle}>KING OF THE COURT</Text>
            <Text style={styles.kopTeaserSub}>Claim the crown at your club</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>

      {/* ── How it works (collapsible) ── */}
      <Pressable style={styles.howHeader} onPress={() => setHowOpen((v) => !v)}>
        <Text style={styles.howTitle}>How leagues work</Text>
        <Ionicons name={howOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textMuted} />
      </Pressable>
      {howOpen && (
        <View style={styles.howBody}>
          {[
            { icon: 'people-outline', text: "Declare a fixed pair with an accepted partner. Your pair gets its own PS Score separate from your solo score." },
            { icon: 'globe-outline', text: "Your pair is automatically ranked in your country's national league — no joining needed." },
            { icon: 'trending-up-outline', text: "Win matches to earn pair PS. The more competitive your opponents, the more you gain." },
            { icon: 'ribbon-outline', text: "There are 5 divisions: Rookie Stage > Club Qualifier > Open Division > Challenger Series > Circuit Apex." },
            { icon: 'trophy-outline', text: "At your local club, the pair with the highest pair PS holds the KOP Crown until another pair knocks them off." },
          ].map((item, i) => (
            <View key={i} style={styles.howRow}>
              <Ionicons name={item.icon as any} size={16} color={theme.accent} style={{ marginTop: 1 }} />
              <Text style={styles.howText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 14 },

  pageTitle: { fontFamily: 'Anton_400Regular', fontSize: 28, color: theme.text, letterSpacing: -0.5 },

  // Division hero
  divisionHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: cardRadius, padding: 18,
  },
  divisionIconCircle: {
    width: 58, height: 58, borderRadius: 29, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  divisionHeroPair: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  divisionHeroName: { fontFamily: 'Anton_400Regular', fontSize: 17, letterSpacing: 0.3 },
  divisionHeroElo: { color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 2 },
  divisionHeroRight: { alignItems: 'flex-end' },
  divisionHeroToNext: { fontFamily: 'Anton_400Regular', fontSize: 22, color: theme.text },
  divisionHeroToNextLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },

  // Progress
  progressWrap: { gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: theme.card, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '700' },

  // Section
  sectionLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '800', letterSpacing: 1.5 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Ladder
  ladderCard: {
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  ladderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  ladderRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  ladderDot: { width: 8, height: 8, borderRadius: 4 },
  ladderName: { fontSize: 13, fontWeight: '700' },
  ladderMin: { fontSize: 10, color: theme.textMuted, fontWeight: '600', marginTop: 1 },

  // Country ranking preview
  rankCard: {
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  rankRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  rankRowMe: { backgroundColor: `${theme.accent}10` },
  rankNum: { fontSize: 14, fontWeight: '900', color: theme.textMuted, width: 28 },
  rankPairName: { fontSize: 13, fontWeight: '700', color: theme.text },
  rankDiv: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  rankElo: { fontSize: 13, fontWeight: '900', color: theme.text },
  emptySmall: { color: theme.textMuted, fontSize: 12, padding: 16, textAlign: 'center' },

  // KOP teaser
  kopTeaser: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border, padding: 16,
  },
  kopTeaserLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kopTeaserCrown: { fontSize: 28 },
  kopTeaserTitle: { color: theme.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  kopTeaserSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },

  // How it works
  howHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
  },
  howTitle: { color: theme.text, fontSize: 13, fontWeight: '700' },
  howBody: { gap: 12, paddingBottom: 8 },
  howRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  howText: { flex: 1, color: theme.textMuted, fontSize: 12, lineHeight: 18 },

  // CTA
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.accent, borderRadius: cardRadius, paddingVertical: 15,
  },
  ctaBtnText: { color: theme.onAccent, fontWeight: '900', fontSize: 14, letterSpacing: 0.8 },

  // Explainer (no-pair state)
  explainer: {
    backgroundColor: theme.card, borderRadius: cardRadius,
    borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8,
  },
  explainerTitle: { color: theme.text, fontSize: 14, fontWeight: '800' },
  explainerBody: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
});
