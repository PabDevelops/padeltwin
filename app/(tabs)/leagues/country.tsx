import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/useSession';
import { useCountryLeagueBoard, useProfile, useMyPairs } from '@/lib/queries';
import { divisionFromPairElo, type PairDivision } from '@/lib/pairDivisions';
import { theme, cardRadius } from '@/constants/theme';
import { ProBadge } from '@/components/ProBadge';
import { CoachBadge } from '@/components/CoachBadge';
import { BackHeader } from '@/components/BackHeader';

const DIVISION_ORDER: PairDivision[] = [
  'Circuit Apex',
  'Challenger Series',
  'Open Division',
  'Club Qualifier',
  'Rookie Stage',
];

const DIVISION_COLORS: Record<PairDivision, string> = {
  'Circuit Apex':      '#C6FF33',
  'Challenger Series': '#FBBF24',
  'Open Division':     '#38BDF8',
  'Club Qualifier':    '#6EE7B7',
  'Rookie Stage':      '#6B7280',
};

export default function CountryLeagueScreen() {
  const router = useRouter();
  const { value, division: divisionParam } = useLocalSearchParams<{ value?: string; division?: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const countryValue = value ?? profile?.country ?? undefined;
  const { data: pairs, isLoading } = useCountryLeagueBoard(countryValue);
  const { data: myPairs } = useMyPairs(userId);
  const myPairIds = new Set((myPairs ?? []).map((p) => p.id));

  const validDivisionParam = DIVISION_ORDER.includes(divisionParam as PairDivision) ? (divisionParam as PairDivision) : null;
  const [selectedDivision, setSelectedDivision] = useState<PairDivision | 'ALL'>(validDivisionParam ?? 'ALL');

  // Compute which divisions have at least 1 pair
  const divisionsWithPairs: PairDivision[] = DIVISION_ORDER.filter((d) =>
    (pairs ?? []).some((p) => divisionFromPairElo(p.elo) === d)
  );

  const displayedPairs = selectedDivision === 'ALL'
    ? (pairs ?? [])
    : (pairs ?? []).filter((p) => divisionFromPairElo(p.elo) === selectedDivision);

  if (!countryValue) {
    const divLabel = validDivisionParam ?? 'this division';
    return (
      <View style={[{ flex: 1, backgroundColor: theme.background }, { paddingTop: insets.top }]}>
        <BackHeader title={validDivisionParam?.toUpperCase() ?? 'LEAGUE'} />
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={theme.border} />
          <Text style={styles.noCountryTitle}>Location not set</Text>
          <Text style={styles.emptyText}>
            Add your country to see who you're competing against in {divLabel}.
          </Text>
          <Pressable style={styles.setLocationBtn} onPress={() => router.push('/edit-profile' as any)}>
            <Ionicons name="pencil-outline" size={15} color={theme.onAccent} />
            <Text style={styles.setLocationBtnText}>SET LOCATION</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const divColor = selectedDivision !== 'ALL' ? DIVISION_COLORS[selectedDivision] : theme.accent;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <BackHeader title={`${countryValue.toUpperCase()} LEAGUE`} />

      {/* Division filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        <Pressable
          style={[styles.divTab, selectedDivision === 'ALL' && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
          onPress={() => setSelectedDivision('ALL')}
        >
          <Text style={[styles.divTabText, selectedDivision === 'ALL' && { color: theme.accent }]}>ALL</Text>
        </Pressable>
        {divisionsWithPairs.map((d) => {
          const c = DIVISION_COLORS[d];
          const active = selectedDivision === d;
          return (
            <Pressable
              key={d}
              style={[styles.divTab, active && { backgroundColor: c + '22', borderColor: c }]}
              onPress={() => setSelectedDivision(d)}
            >
              <Text style={[styles.divTabText, active && { color: c }]}>{d.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      ) : displayedPairs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="podium-outline" size={48} color={theme.border} />
          <Text style={styles.emptyText}>No pairs in this division yet</Text>
        </View>
      ) : (
        <FlatList
          data={displayedPairs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 0 }}
          style={{ flex: 1 }}
          ListHeaderComponent={selectedDivision !== 'ALL' ? (
            <View style={[styles.divisionBanner, { borderColor: divColor + '44', backgroundColor: divColor + '10' }]}>
              <Text style={[styles.divisionBannerText, { color: divColor }]}>
                {selectedDivision.toUpperCase()}
              </Text>
              <Text style={styles.divisionBannerCount}>{displayedPairs.length} pairs</Text>
            </View>
          ) : null}
          renderItem={({ item, index }) => {
            const globalRank = (pairs ?? []).findIndex((p) => p.id === item.id) + 1;
            const localRank = index + 1;
            const rank = selectedDivision === 'ALL' ? globalRank : localRank;
            const isMine = myPairIds.has(item.id);
            const div = divisionFromPairElo(item.elo);
            const divC = DIVISION_COLORS[div];
            const showDivHeader = selectedDivision === 'ALL' && (index === 0 || div !== divisionFromPairElo(displayedPairs[index - 1].elo));

            return (
              <View>
                {showDivHeader && (
                  <View style={[styles.divHeader, { borderLeftColor: divC }]}>
                    <Text style={[styles.divHeaderText, { color: divC }]}>{div.toUpperCase()}</Text>
                  </View>
                )}
                <View style={[
                  styles.row,
                  index < displayedPairs.length - 1 && styles.rowBorder,
                  isMine && styles.rowMe,
                  index === 0 && selectedDivision === 'ALL' && styles.rowFirst,
                ]}>
                  <Text style={[styles.rankText, rank <= 3 && { color: theme.accent }]}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pairName} numberOfLines={1}>
                      {item.player_a?.full_name?.split(' ')[0] ?? 'P'} & {item.player_b?.full_name?.split(' ')[0] ?? 'P'}
                      {isMine ? '  YOU' : ''}
                    </Text>
                    {selectedDivision === 'ALL' && (
                      <Text style={[styles.pairDiv, { color: divC }]}>{div}</Text>
                    )}
                  </View>
                  {item.player_a?.is_pro || item.player_b?.is_pro ? <ProBadge size="sm" /> : null}
                  {item.player_a?.coach_status === 'approved' || item.player_b?.coach_status === 'approved' ? <CoachBadge size="sm" /> : null}
                  <Text style={[styles.pairElo, isMine && { color: theme.accent }]}>{item.elo} PS</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  noCountryTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  setLocationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.accent, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  setLocationBtnText: { color: theme.onAccent, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  tabScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: theme.border },
  tabContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  divTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: theme.border,
  },
  divTabText: { color: theme.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  divisionBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: cardRadius, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  divisionBannerText: { fontFamily: 'Anton_400Regular', fontSize: 18, letterSpacing: 0.3 },
  divisionBannerCount: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },

  divHeader: {
    borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8,
    marginTop: 8, marginBottom: 2,
  },
  divHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 4, paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  rowMe: { backgroundColor: `${theme.accent}0A`, borderRadius: 10, paddingHorizontal: 10 },
  rowFirst: {},

  rankText: { width: 32, color: theme.textMuted, fontWeight: '900', fontSize: 14 },
  pairName: { color: theme.text, fontWeight: '700', fontSize: 13 },
  pairDiv: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  pairElo: { color: theme.text, fontWeight: '900', fontSize: 13 },
});
