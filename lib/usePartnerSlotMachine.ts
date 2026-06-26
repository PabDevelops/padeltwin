import { useMemo } from 'react';
import { useCompatiblePlayers, usePartnerRequests } from './queries';
import type { Profile } from '../types/database';

// Candidates eligible for the slot machine: level/zone-compatible players
// (same pool as the Partners grid) with no existing request between the two
// users in either direction — landing on someone you've already connected
// with, or who already declined you, would be a dead end.
export function usePartnerSlotMachineCandidates(userId: string | undefined, profile: Profile | undefined) {
  const { data: compatible, isLoading: compatLoading } = useCompatiblePlayers(userId, profile);
  const { data: requests, isLoading: requestsLoading } = usePartnerRequests(userId);

  const candidates = useMemo(() => {
    if (!compatible) return [];
    if (!requests) return compatible;
    const linkedIds = new Set(
      requests.flatMap((r) => [r.from_id, r.to_id]).filter((id) => id !== userId)
    );
    return compatible.filter((p) => !linkedIds.has(p.id));
  }, [compatible, requests, userId]);

  return { candidates, isLoading: compatLoading || requestsLoading };
}

// Picks the winner the reel will land on. Uniform random for now — could
// later weight by elo/level closeness, but that's a tuning decision, not a
// correctness one.
export function pickSlotMachineWinner(candidates: Profile[]): Profile | null {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Builds the full sequence of profiles the reel scrolls through, ending on
// `winner`. The animation only needs to scroll through this array at
// whatever speed/easing it wants — the randomness and the stopping point
// are decided here, not in the UI.
export function buildSlotMachineReel(
  candidates: Profile[],
  winner: Profile,
  reelLength = 24
): Profile[] {
  if (candidates.length === 0) return [];
  const reel: Profile[] = [];
  for (let i = 0; i < reelLength - 1; i++) {
    reel.push(candidates[Math.floor(Math.random() * candidates.length)]);
  }
  reel.push(winner);
  return reel;
}
