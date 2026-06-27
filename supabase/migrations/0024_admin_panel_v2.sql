-- God Mode v2: dashboard metrics, a visual wrapper around the existing
-- collusion-detection SQL function, league oversight, and mass push
-- broadcast — all admin-only, same security-definer pattern as 0023.

create or replace function public.admin_dashboard_stats()
returns table (
  total_players bigint,
  total_confirmed_matches bigint,
  average_elo numeric,
  signups_last_7_days bigint,
  pending_coach_applications bigint,
  open_reports bigint,
  active_tournaments bigint
) as $$
  select
    (select count(*) from profiles) as total_players,
    (select count(*) from match_results where status = 'confirmed') as total_confirmed_matches,
    (select round(avg(elo), 0) from profiles) as average_elo,
    (select count(*) from profiles where created_at > now() - interval '7 days') as signups_last_7_days,
    (select count(*) from profiles where coach_status = 'pending') as pending_coach_applications,
    (select count(*) from reports where status = 'open') as open_reports,
    (select count(*) from tournaments where status = 'active') as active_tournaments
  where is_admin(auth.uid());
$$ language sql security definer stable;

-- The 0022 collusion function is intentionally locked down to the SQL
-- editor only (revoked from authenticated). This wrapper is the
-- app-callable version for the admin panel UI, gated the same way as
-- everything else here instead of relaxing 0022's grants.
create or replace function public.admin_collusion_candidates(p_repeat_ratio_threshold numeric default 0.6, p_min_matches int default 5)
returns table (
  profile_id uuid, full_name text, total_matches int, distinct_opponents int,
  top_opponent_id uuid, top_opponent_name text, top_opponent_matches int,
  repeat_ratio numeric, elo_gain_last_10 int
) as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  return query select * from flagged_collusion_candidates(p_repeat_ratio_threshold, p_min_matches);
end;
$$ language plpgsql security definer stable;

create or replace function public.admin_list_leagues()
returns table (id uuid, name text, invite_code text, created_by uuid, creator_name text, member_count bigint, created_at timestamptz) as $$
  select l.id, l.name, l.invite_code, l.created_by, p.full_name, count(lm.profile_id), l.created_at
  from leagues l
  join profiles p on p.id = l.created_by
  left join league_members lm on lm.league_id = l.id
  where is_admin(auth.uid())
  group by l.id, l.name, l.invite_code, l.created_by, p.full_name, l.created_at
  order by l.created_at desc;
$$ language sql security definer stable;

create or replace function public.admin_league_members(p_league_id uuid)
returns table (profile_id uuid, full_name text, elo int, joined_at timestamptz) as $$
  select p.id, p.full_name, p.elo, lm.joined_at
  from league_members lm
  join profiles p on p.id = lm.profile_id
  where is_admin(auth.uid()) and lm.league_id = p_league_id
  order by p.elo desc;
$$ language sql security definer stable;

create or replace function public.admin_delete_league(p_league_id uuid)
returns void as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from leagues where id = p_league_id;
end;
$$ language plpgsql security definer;

-- Broadcast: 'all' | 'coaches' | 'pro', optionally narrowed further by zone
-- (case-insensitive substring match, same convention as the rest of the
-- app's zone filtering). Returns how many tokens it actually sent to, since
-- players without a push_token are silently skipped by send_push_notification.
create or replace function public.admin_broadcast_push(p_segment text, p_title text, p_body text, p_zone text default null)
returns int as $$
declare
  v_token text;
  v_count int := 0;
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_segment not in ('all', 'coaches', 'pro') then raise exception 'Invalid segment'; end if;

  for v_token in
    select push_token from profiles
    where push_token is not null
      and (p_zone is null or zone ilike '%' || p_zone || '%')
      and (
        p_segment = 'all'
        or (p_segment = 'coaches' and coach_status = 'approved')
        or (p_segment = 'pro' and is_pro)
      )
  loop
    perform send_push_notification(v_token, p_title, p_body, jsonb_build_object('type', 'admin_broadcast'));
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer;
