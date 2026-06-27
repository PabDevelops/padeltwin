-- Collusion detection v1: flag suspicious players for manual review, never
-- auto-punish — a tight-knit friend group that plays itself constantly
-- looks identical to two accounts farming each other, so a human has to
-- make the call. Same "manual until volume justifies a tool" pattern as
-- coach review (0017) and reports (0021).
--
-- Signal: repeat_ratio (share of a player's confirmed matches against their
-- single most-played opponent) combined with elo_gain_last_10 (their ELO
-- movement over their last 10 confirmed results). A real social group
-- spreads matches across several regulars and gains ELO slowly; two
-- colluding accounts concentrate on one opponent and move fast.
--
-- Admin-only: not granted to `authenticated`, callable only from the SQL
-- editor (postgres/service_role), same access model as the reports table.
create or replace function public.flagged_collusion_candidates(
  p_repeat_ratio_threshold numeric default 0.6,
  p_min_matches int default 5
)
returns table (
  profile_id uuid,
  full_name text,
  total_matches int,
  distinct_opponents int,
  top_opponent_id uuid,
  top_opponent_name text,
  top_opponent_matches int,
  repeat_ratio numeric,
  elo_gain_last_10 int
) as $$
  with player_matches as (
    select
      pid as profile_id,
      mr.id as match_result_id,
      case
        when pid in (mr.team_a_player1, mr.team_a_player2) then array[mr.team_b_player1, mr.team_b_player2]
        else array[mr.team_a_player1, mr.team_a_player2]
      end as opponents
    from match_results mr
    cross join lateral unnest(array[mr.team_a_player1, mr.team_a_player2, mr.team_b_player1, mr.team_b_player2]) as pid
    where mr.status = 'confirmed'
  ),
  opponent_pairs as (
    select profile_id, match_result_id, unnest(opponents) as opponent_id
    from player_matches
  ),
  opponent_counts as (
    select profile_id, opponent_id, count(*) as matches_together
    from opponent_pairs
    group by profile_id, opponent_id
  ),
  totals as (
    select profile_id, count(distinct match_result_id) as total_matches, count(distinct opponent_id) as distinct_opponents
    from opponent_pairs
    group by profile_id
  ),
  top_opponent as (
    select
      oc.profile_id, oc.opponent_id, oc.matches_together,
      row_number() over (partition by oc.profile_id order by oc.matches_together desc) as rn
    from opponent_counts oc
  ),
  recent_gain as (
    select profile_id, sum(delta) as gain
    from (
      select profile_id, delta, row_number() over (partition by profile_id order by created_at desc) as rn
      from elo_history
    ) ranked
    where rn <= 10
    group by profile_id
  )
  select
    t.profile_id,
    p.full_name,
    t.total_matches,
    t.distinct_opponents,
    topo.opponent_id as top_opponent_id,
    op.full_name as top_opponent_name,
    topo.matches_together as top_opponent_matches,
    round(topo.matches_together::numeric / t.total_matches, 2) as repeat_ratio,
    coalesce(rg.gain, 0) as elo_gain_last_10
  from totals t
  join profiles p on p.id = t.profile_id
  join top_opponent topo on topo.profile_id = t.profile_id and topo.rn = 1
  left join profiles op on op.id = topo.opponent_id
  left join recent_gain rg on rg.profile_id = t.profile_id
  where t.total_matches >= p_min_matches
    and topo.matches_together::numeric / t.total_matches >= p_repeat_ratio_threshold
  order by elo_gain_last_10 desc, repeat_ratio desc;
$$ language sql security definer stable;

revoke all on function public.flagged_collusion_candidates(numeric, int) from public;
revoke all on function public.flagged_collusion_candidates(numeric, int) from authenticated;
