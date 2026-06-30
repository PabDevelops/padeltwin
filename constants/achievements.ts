import type { AchievementType } from '@/types/database';

// Copy + icon hints for each achievement, so the feed/badge UI doesn't have
// to invent wording. `icon` is an Ionicons name (already used elsewhere in
// the app), kept as a plain string so this file has no extra dependency.
export const ACHIEVEMENT_LABELS: Record<AchievementType, string> = {
  first_match: 'Played first match',
  matches_5: '5 matches played',
  matches_10: '10 matches played',
  matches_25: '25 matches played',
  first_win: 'First win',
  wins_5: '5 wins',
  wins_10: '10 wins',
  wins_25: '25 wins',
  elo_1300: 'Reached 1300 ELO',
  elo_1400: 'Reached 1400 ELO',
  elo_1500: 'Reached 1500 ELO',
};

export const ACHIEVEMENT_ICONS: Record<AchievementType, string> = {
  first_match: 'tennisball',
  matches_5: 'calendar',
  matches_10: 'calendar',
  matches_25: 'calendar',
  first_win: 'trophy',
  wins_5: 'trophy',
  wins_10: 'trophy',
  wins_25: 'trophy',
  elo_1300: 'trending-up',
  elo_1400: 'trending-up',
  elo_1500: 'trending-up',
};

export type AchievementTier = 'bronze' | 'silver' | 'gold';

// Rarity tier for trophy-case styling — bigger milestones get a richer badge.
export const ACHIEVEMENT_TIERS: Record<AchievementType, AchievementTier> = {
  first_match: 'bronze',
  matches_5: 'bronze',
  matches_10: 'silver',
  matches_25: 'gold',
  first_win: 'bronze',
  wins_5: 'silver',
  wins_10: 'gold',
  wins_25: 'gold',
  elo_1300: 'silver',
  elo_1400: 'gold',
  elo_1500: 'gold',
};

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C8',
  gold: '#FFD700',
};
