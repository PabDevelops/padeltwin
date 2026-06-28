import type { PlayerLevel } from '@/types/database';

export type YearsPlaying = 'under1' | '1to3' | '3to5' | 'over5';
export type CompetitionExperience = 'none' | 'club' | 'local' | 'ranked';
export type WeeklyFrequency = 'lessThanOne' | 'oneToTwo' | 'threeOrMore';

export const YEARS_PLAYING_OPTIONS: { value: YearsPlaying; label: string }[] = [
  { value: 'under1', label: 'Less than 1 year' },
  { value: '1to3', label: '1–3 years' },
  { value: '3to5', label: '3–5 years' },
  { value: 'over5', label: '5+ years' },
];

export const COMPETITION_OPTIONS: { value: CompetitionExperience; label: string }[] = [
  { value: 'none', label: "I've never competed" },
  { value: 'club', label: 'Friendly club matches' },
  { value: 'local', label: 'Local leagues / tournaments' },
  { value: 'ranked', label: 'Regional or national ranked' },
];

export const FREQUENCY_OPTIONS: { value: WeeklyFrequency; label: string }[] = [
  { value: 'lessThanOne', label: 'Less than once a week' },
  { value: 'oneToTwo', label: '1–2 times a week' },
  { value: 'threeOrMore', label: '3+ times a week' },
];

const LEVEL_POINTS: Record<PlayerLevel, number> = {
  iniciacion: 0,
  intermedio: 150,
  avanzado: 300,
};

const YEARS_POINTS: Record<YearsPlaying, number> = {
  under1: 0,
  '1to3': 40,
  '3to5': 90,
  over5: 150,
};

const COMPETITION_POINTS: Record<CompetitionExperience, number> = {
  none: 0,
  club: 30,
  local: 80,
  ranked: 180,
};

const FREQUENCY_POINTS: Record<WeeklyFrequency, number> = {
  lessThanOne: 0,
  oneToTwo: 30,
  threeOrMore: 60,
};

const BASE_ELO = 1000;

export function computeStartingElo(answers: {
  level: PlayerLevel;
  yearsPlaying: YearsPlaying;
  competition: CompetitionExperience;
  frequency: WeeklyFrequency;
}): number {
  return (
    BASE_ELO +
    LEVEL_POINTS[answers.level] +
    YEARS_POINTS[answers.yearsPlaying] +
    COMPETITION_POINTS[answers.competition] +
    FREQUENCY_POINTS[answers.frequency]
  );
}

// Once a player has an ELO (from onboarding placement or real matches), that
// number is the source of truth for their level — there's no separate
// "beginner/intermediate/advanced" self-rating to keep in sync with it.
export function levelFromElo(elo: number): PlayerLevel {
  if (elo < 1150) return 'iniciacion';
  if (elo < 1450) return 'intermedio';
  return 'avanzado';
}
