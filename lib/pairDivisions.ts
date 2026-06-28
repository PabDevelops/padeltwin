export type PairDivision = 'Circuit Apex' | 'Challenger Series' | 'Open Division' | 'Club Qualifier' | 'Rookie Stage';

export function divisionFromPairElo(elo: number): PairDivision {
  if (elo >= 1800) return 'Circuit Apex';
  if (elo >= 1500) return 'Challenger Series';
  if (elo >= 1200) return 'Open Division';
  if (elo >= 1000) return 'Club Qualifier';
  return 'Rookie Stage';
}
