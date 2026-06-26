import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMatches } from '@/lib/queries';
import type { MatchWithPlayers, PlayerLevel } from '@/types/database';
import { theme, cardRadius, chipRadius } from '@/constants/theme';
import { LEVELS, LEVEL_LABELS } from '@/constants/levels';

export default function MatchSearchScreen() {
  const router = useRouter();
  const [zone, setZone] = useState('');
  const [level, setLevel] = useState<PlayerLevel | undefined>(undefined);
  const [focusedInput, setFocusedInput] = useState(false);
  const { data: matches, isLoading, refetch, isRefetching } = useMatches({ zone, level });

  function renderItem({ item }: { item: MatchWithPlayers }) {
    const joinedCount = item.match_players?.length ?? 0;
    const isFull = joinedCount >= item.max_players;

    return (
      <Pressable 
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]} 
        onPress={() => router.push(`/match/${item.id}`)}
      >
        <View style={styles.cardAccentBar} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.location}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{item.mode === 'pair' ? 'PAIR' : 'INDIVIDUAL'}</Text>
            </View>
          </View>
          
          <Text style={styles.cardSubtitle}>
            📅 {new Date(item.date_time).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} • {new Date(item.date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>

          <View style={styles.cardRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{LEVEL_LABELS[item.level].toUpperCase()}</Text>
            </View>
            <View style={styles.slotsContainer}>
              <View style={styles.dotsRow}>
                {Array.from({ length: item.max_players }).map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.slotDot, 
                      i < joinedCount ? styles.slotDotFilled : styles.slotDotEmpty
                    ]} 
                  />
                ))}
              </View>
              <Text style={[styles.slots, isFull && { color: theme.danger }]}>
                {isFull ? 'FULL' : `${joinedCount}/${item.max_players} PLAYERS`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.tagline}>LIVE MATCHMAKING</Text>
        <Text style={styles.title}>MATCH FEED</Text>
      </View>

      <TextInput
        style={[styles.input, focusedInput && styles.inputFocused]}
        placeholder="FILTER BY CITY (E.G. MADRID)..."
        placeholderTextColor={theme.textMuted}
        value={zone}
        onChangeText={setZone}
        onFocus={() => setFocusedInput(true)}
        onBlur={() => setFocusedInput(false)}
      />

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>SKILL LEVEL</Text>
        <View style={styles.levelRow}>
          <Pressable
            style={({ pressed }) => [
              styles.levelChip,
              !level && styles.levelChipActive,
              pressed && { scale: 0.96 } as any
            ]}
            onPress={() => setLevel(undefined)}>
            <Text style={[styles.levelChipText, !level && styles.levelChipTextActive]}>ALL LEVELS</Text>
          </Pressable>
          {LEVELS.map((l) => (
            <Pressable
              key={l}
              style={({ pressed }) => [
                styles.levelChip,
                level === l && styles.levelChipActive,
                pressed && { scale: 0.96 } as any
              ]}
              onPress={() => setLevel(l)}>
              <Text style={[styles.levelChipText, level === l && styles.levelChipTextActive]}>
                {LEVEL_LABELS[l].toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} size="large" />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>NO MATCHES FOUND</Text>
              <Text style={styles.emptySub}>Try changing the city or skill level filter.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: theme.background },
  headerContainer: { marginBottom: 14, marginTop: 12 },
  tagline: { fontSize: 10, fontWeight: '900', color: theme.primary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: theme.text, letterSpacing: -0.5 },
  input: { 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: 14, 
    paddingHorizontal: 16,
    paddingVertical: 14, 
    fontSize: 14, 
    fontWeight: '800',
    marginBottom: 16, 
    backgroundColor: theme.card, 
    color: theme.text,
    letterSpacing: 0.5,
  },
  inputFocused: {
    borderColor: theme.borderActive,
    backgroundColor: '#1B1C24',
  },
  filterSection: { marginBottom: 16 },
  filterLabel: { fontSize: 9, fontWeight: '900', color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  levelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  levelChip: { 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: chipRadius, 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    backgroundColor: theme.card 
  },
  levelChipActive: { 
    backgroundColor: 'rgba(255, 92, 0, 0.15)', 
    borderColor: theme.primary 
  },
  levelChipText: { color: theme.textMuted, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  levelChipTextActive: { color: theme.primary, fontWeight: '900' },
  listContent: { gap: 12, paddingVertical: 8 },
  card: { 
    flexDirection: 'row',
    borderRadius: cardRadius, 
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccentBar: {
    width: 3,
    backgroundColor: theme.primary,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.text, flex: 1, marginRight: 8, textTransform: 'uppercase', letterSpacing: 0.2 },
  modeBadge: { 
    backgroundColor: '#22242E', 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: 6, 
    paddingHorizontal: 6, 
    paddingVertical: 3 
  },
  modeBadgeText: { color: theme.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  cardSubtitle: { color: theme.textMuted, marginTop: 4, fontSize: 12, fontWeight: '700' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  badge: { backgroundColor: 'rgba(255, 92, 0, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 92, 0, 0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: theme.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  slotsContainer: { alignItems: 'flex-end' },
  dotsRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  slotDot: { width: 6, height: 6, borderRadius: 1.5 },
  slotDotFilled: { backgroundColor: theme.primary },
  slotDotEmpty: { backgroundColor: '#22242E' },
  slots: { color: theme.text, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  empty: { textAlign: 'center', color: theme.text, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  emptySub: { textAlign: 'center', color: theme.textMuted, fontSize: 12, marginTop: 4, fontWeight: '700' },
});
