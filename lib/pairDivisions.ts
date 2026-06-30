export type PairDivision = 'Circuit Apex' | 'Challenger Series' | 'Open Division' | 'Club Qualifier' | 'Rookie Stage';

const DIVISION_THRESHOLDS: { name: PairDivision; min: number }[] = [
  { name: 'Rookie Stage', min: 0 },
  { name: 'Club Qualifier', min: 1000 },
  { name: 'Open Division', min: 1200 },
  { name: 'Challenger Series', min: 1500 },
  { name: 'Circuit Apex', min: 1800 },
];

export function divisionFromPairElo(elo: number): PairDivision {
  if (elo >= 1800) return 'Circuit Apex';
  if (elo >= 1500) return 'Challenger Series';
  if (elo >= 1200) return 'Open Division';
  if (elo >= 1000) return 'Club Qualifier';
  return 'Rookie Stage';
}

export interface DivisionProgress {
  division: PairDivision;
  nextDivision: PairDivision | null;
  progress: number; // 0..1 toward nextDivision, 1 if already at the top
  eloToNext: number | null;
}

// How far a pair is through its current division band, for a progress bar
// toward the next one up (Strava segment-style).
export function divisionProgress(elo: number): DivisionProgress {
  const idx = DIVISION_THRESHOLDS.findIndex((d, i) => {
    const next = DIVISION_THRESHOLDS[i + 1];
    return elo >= d.min && (!next || elo < next.min);
  });
  const current = DIVISION_THRESHOLDS[idx];
  const next = DIVISION_THRESHOLDS[idx + 1];
  if (!next) {
    return { division: current.name, nextDivision: null, progress: 1, eloToNext: null };
  }
  const span = next.min - current.min;
  const progress = Math.max(0, Math.min(1, (elo - current.min) / span));
  return { division: current.name, nextDivision: next.name, progress, eloToNext: next.min - elo };
}
