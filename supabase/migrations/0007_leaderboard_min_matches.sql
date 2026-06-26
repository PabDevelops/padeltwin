-- Players with fewer than ELO_PROVISIONAL_MATCHES (5) recorded results have a
-- provisional/unreliable elo and should not show up on the public leaderboard.
-- Keep this number in sync with constants/elo.ts (ELO_PROVISIONAL_MATCHES).
--
-- match_results has RLS that only lets a user see rows they participated in,
-- so a plain view's subquery would undercount other players' matches. This
-- function runs as security definer (like apply_elo_change above) to count
-- across all match_results regardless of who is calling it.
create or replace function public.leaderboard_profiles()
returns setof profiles as $$
  select p.*
  from profiles p
  where (
    select count(*)
    from match_results r
    where p.id in (r.team_a_player1, r.team_a_player2, r.team_b_player1, r.team_b_player2)
  ) >= 5;
$$ language sql security definer stable;

grant execute on function public.leaderboard_profiles() to authenticated;
