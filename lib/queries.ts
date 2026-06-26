import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { isEloProvisional } from "../constants/elo";
import type {
  Match,
  MatchResult,
  MatchResultWithProfiles,
  MatchWithPlayers,
  PartnerRequest,
  PartnerRequestWithProfiles,
  PlayerLevel,
  Profile,
  RequestStatus,
  SetScore,
  Team,
} from "../types/database";

const LEVEL_ORDER: PlayerLevel[] = ["iniciacion", "intermedio", "avanzado"];

function compatibleLevels(level: PlayerLevel | null): PlayerLevel[] {
  if (!level) return LEVEL_ORDER;
  const index = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER.filter((_, i) => Math.abs(i - index) <= 1);
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Profile> & { id: string }) => {
      const { error } = await supabase.from("profiles").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profile", variables.id] });
    },
  });
}

export function useMatches(filters: { zone?: string; level?: PlayerLevel }) {
  return useQuery({
    queryKey: ["matches", filters],
    queryFn: async () => {
      let query = supabase
        .from("matches")
        .select("*, match_players(*, profiles(*))")
        .eq("status", "open")
        .eq("visibility", "open")
        .order("date_time", { ascending: true });

      if (filters.zone) query = query.ilike("location", `%${filters.zone}%`);
      if (filters.level) query = query.eq("level", filters.level);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MatchWithPlayers[];
    },
  });
}

export function useMatch(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, match_players(*, profiles(*))")
        .eq("id", matchId!)
        .single();
      if (error) throw error;
      return data as unknown as MatchWithPlayers;
    },
    enabled: !!matchId,
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      match: Pick<
        Match,
        "created_by" | "date_time" | "location" | "level" | "max_players" | "mode" | "visibility"
      > & { partnerId?: string }
    ) => {
      const { partnerId, ...matchFields } = match;
      const { data, error } = await supabase.from("matches").insert(matchFields).select().single();
      if (error) throw error;
      const created = data as Match;

      if (matchFields.mode === "pair" && partnerId) {
        const { error: joinError } = await supabase.from("match_players").insert([
          { match_id: created.id, player_id: matchFields.created_by },
          { match_id: created.id, player_id: partnerId },
        ]);
        if (joinError) throw joinError;
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useJoinMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      const { error } = await supabase
        .from("match_players")
        .insert({ match_id: matchId, player_id: playerId });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["match", variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["myUpcomingMatches"] });
    },
  });
}

export function useLeaveMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("match_id", matchId)
        .eq("player_id", playerId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["match", variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["myUpcomingMatches"] });
    },
  });
}

export function useCompatiblePlayers(currentUserId: string | undefined, profile: Profile | undefined) {
  return useQuery({
    queryKey: ["compatiblePlayers", currentUserId, profile?.level, profile?.zone],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").neq("id", currentUserId!);

      if (profile?.level) query = query.in("level", compatibleLevels(profile.level));
      if (profile?.zone) query = query.ilike("zone", `%${profile.zone}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!currentUserId && !!profile,
  });
}

export function usePartnerRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["partnerRequests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_requests")
        .select("*, from_profile:profiles!partner_requests_from_id_fkey(*), to_profile:profiles!partner_requests_to_id_fkey(*)")
        .or(`from_id.eq.${userId},to_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PartnerRequestWithProfiles[];
    },
    enabled: !!userId,
  });
}

export function useSendPartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: string; toId: string }) => {
      const { error } = await supabase
        .from("partner_requests")
        .insert({ from_id: fromId, to_id: toId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnerRequests"] });
    },
  });
}

export function useRespondPartnerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: RequestStatus }) => {
      const { error } = await supabase
        .from("partner_requests")
        .update({ status })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnerRequests"] });
    },
  });
}

const RESULT_PROFILES_SELECT =
  "*, team_a_player1_profile:profiles!match_results_team_a_player1_fkey(*), team_a_player2_profile:profiles!match_results_team_a_player2_fkey(*), team_b_player1_profile:profiles!match_results_team_b_player1_fkey(*), team_b_player2_profile:profiles!match_results_team_b_player2_fkey(*)";

function didWin(result: MatchResult, userId: string): boolean {
  const inTeamA = result.team_a_player1 === userId || result.team_a_player2 === userId;
  return (inTeamA && result.winner === "a") || (!inTeamA && result.winner === "b");
}

export function useMatchResult(matchId: string | undefined) {
  return useQuery({
    queryKey: ["matchResult", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_results")
        .select(RESULT_PROFILES_SELECT)
        .eq("match_id", matchId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MatchResultWithProfiles | null;
    },
    enabled: !!matchId,
  });
}

export function useRecordMatchResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (result: {
      matchId: string;
      teamAPlayer1: string;
      teamAPlayer2: string;
      teamBPlayer1: string;
      teamBPlayer2: string;
      sets: SetScore[];
      winner: Team;
      recordedBy: string;
    }) => {
      const { error } = await supabase.from("match_results").insert({
        match_id: result.matchId,
        team_a_player1: result.teamAPlayer1,
        team_a_player2: result.teamAPlayer2,
        team_b_player1: result.teamBPlayer1,
        team_b_player2: result.teamBPlayer2,
        sets: result.sets,
        winner: result.winner,
        recorded_by: result.recordedBy,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matchResult", variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentResults"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useMyStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["myStats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_results")
        .select("*")
        .or(
          `team_a_player1.eq.${userId},team_a_player2.eq.${userId},team_b_player1.eq.${userId},team_b_player2.eq.${userId}`
        );
      if (error) throw error;
      const results = (data as MatchResult[]) ?? [];
      const played = results.length;
      const won = results.filter((r) => didWin(r, userId!)).length;
      return {
        played,
        won,
        winRate: played > 0 ? Math.round((won / played) * 100) : 0,
        eloProvisional: isEloProvisional(played),
      };
    },
    enabled: !!userId,
  });
}

export function useRecentResults(userId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["recentResults", userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_results")
        .select(RESULT_PROFILES_SELECT)
        .or(
          `team_a_player1.eq.${userId},team_a_player2.eq.${userId},team_b_player1.eq.${userId},team_b_player2.eq.${userId}`
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as unknown as MatchResultWithProfiles[];
    },
    enabled: !!userId,
  });
}

export function useMyUpcomingMatches(userId: string | undefined) {
  return useQuery({
    queryKey: ["myUpcomingMatches", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("matches(*, match_players(*, profiles(*)))")
        .eq("player_id", userId!);
      if (error) throw error;
      
      const now = new Date();
      const upcoming = (data ?? [])
        .map((mp: any) => mp.matches)
        .filter((m: any) => m && m.status === "open" && new Date(m.date_time) > now)
        .sort((a: any, b: any) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
        
      return upcoming as unknown as MatchWithPlayers[];
    },
    enabled: !!userId,
  });
}

export function useLeaderboard(zone: string | null | undefined) {
  return useQuery({
    queryKey: ["leaderboard", zone],
    queryFn: async () => {
      let query = supabase.rpc("leaderboard_profiles").select("*").order("elo", { ascending: false }).limit(10);
      if (zone) query = query.ilike("zone", `%${zone}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });
}
