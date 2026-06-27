-- Admin/moderator panel: a separate web-only surface (gated route group in
-- the same Expo Router app, accessible at /admin) for tasks we've been
-- doing by hand in the SQL editor — coach review, report triage, account
-- control, content/chat moderation — plus tournament management, which is
-- admin-created only (no self-serve club flow).
--
-- Every admin action goes through a security-definer RPC that checks
-- is_admin() internally, rather than relaxing table RLS broadly. That
-- keeps the existing player-facing policies untouched and centralizes the
-- privileged logic in one place we can audit.

alter table profiles add column is_admin boolean not null default false;
alter table profiles add column is_banned boolean not null default false;
alter table profiles add column banned_reason text;

create or replace function public.is_admin(p_uid uuid)
returns boolean as $$
  select coalesce((select is_admin from profiles where id = p_uid), false);
$$ language sql security definer stable;

-- ---- Coach review ----
create or replace function public.admin_set_coach_status(p_profile_id uuid, p_status text)
returns void as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('none', 'pending', 'approved', 'rejected') then
    raise exception 'Invalid status';
  end if;
  update profiles set coach_status = p_status where id = p_profile_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_list_pending_coaches()
returns setof profiles as $$
  select * from profiles where coach_status = 'pending' and is_admin(auth.uid()) order by created_at;
$$ language sql security definer stable;

-- ---- Reports ----
create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  id uuid, reporter_id uuid, reporter_name text, target_type report_target_type,
  target_id uuid, reason text, details text, status text, created_at timestamptz
) as $$
  select r.id, r.reporter_id, p.full_name, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at
  from reports r
  join profiles p on p.id = r.reporter_id
  where is_admin(auth.uid()) and (p_status is null or r.status = p_status)
  order by r.created_at desc;
$$ language sql security definer stable;

create or replace function public.admin_resolve_report(p_report_id uuid, p_status text)
returns void as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('open', 'reviewed', 'dismissed') then
    raise exception 'Invalid status';
  end if;
  update reports set status = p_status where id = p_report_id;
end;
$$ language plpgsql security definer;

-- ---- Account control ----
create or replace function public.admin_search_profiles(p_query text)
returns setof profiles as $$
  select * from profiles
  where is_admin(auth.uid())
    and (full_name ilike '%' || p_query || '%' or zone ilike '%' || p_query || '%')
  order by created_at desc
  limit 50;
$$ language sql security definer stable;

create or replace function public.admin_set_banned(p_profile_id uuid, p_banned boolean, p_reason text default null)
returns void as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  update profiles set is_banned = p_banned, banned_reason = case when p_banned then p_reason else null end
  where id = p_profile_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_set_pro(p_profile_id uuid, p_is_pro boolean)
returns void as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;
  update profiles set is_pro = p_is_pro where id = p_profile_id;
end;
$$ language plpgsql security definer;

-- ---- Content & chat moderation ----
create or replace function public.admin_delete_achievement(p_achievement_id uuid)
returns void as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from achievements where id = p_achievement_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_delete_message(p_message_id uuid)
returns void as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from messages where id = p_message_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_search_messages(p_query text)
returns table (id uuid, request_id uuid, sender_id uuid, sender_name text, body text, created_at timestamptz) as $$
  select m.id, m.request_id, m.sender_id, p.full_name, m.body, m.created_at
  from messages m
  join profiles p on p.id = m.sender_id
  where is_admin(auth.uid()) and m.body ilike '%' || p_query || '%'
  order by m.created_at desc
  limit 100;
$$ language sql security definer stable;

create or replace function public.admin_recent_achievements(p_limit int default 50)
returns table (id uuid, profile_id uuid, full_name text, type achievement_type, created_at timestamptz) as $$
  select a.id, a.profile_id, p.full_name, a.type, a.created_at
  from achievements a
  join profiles p on p.id = a.profile_id
  where is_admin(auth.uid())
  order by a.created_at desc
  limit p_limit;
$$ language sql security definer stable;

-- ---- Tournaments (admin-created only) ----
create type tournament_format as enum ('round_robin', 'bracket');
create type tournament_status as enum ('draft', 'active', 'completed');

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format tournament_format not null,
  status tournament_status not null default 'draft',
  zone text,
  starts_at timestamptz,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- An "entrant" is one slot in the tournament — a single player or a fixed
-- pair (partner_id), since padel tournaments are normally played as pairs.
create table tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  partner_id uuid references profiles (id) on delete cascade,
  seed int,
  created_at timestamptz not null default now(),
  unique (tournament_id, profile_id)
);

create table tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  round int not null default 1,
  position int not null default 0,
  entrant_a_id uuid references tournament_participants (id) on delete cascade,
  entrant_b_id uuid references tournament_participants (id) on delete cascade,
  sets jsonb,
  winner_entrant_id uuid references tournament_participants (id),
  status text not null default 'pending' check (status in ('pending', 'completed', 'bye')),
  created_at timestamptz not null default now()
);

alter table tournaments enable row level security;
alter table tournament_participants enable row level security;
alter table tournament_matches enable row level security;

-- Read-only for everyone (players can see tournaments/brackets in-app
-- later); all writes go through the admin RPCs below.
create policy "Tournaments are viewable by authenticated users" on tournaments for select to authenticated using (true);
create policy "Tournament participants are viewable by authenticated users" on tournament_participants for select to authenticated using (true);
create policy "Tournament matches are viewable by authenticated users" on tournament_matches for select to authenticated using (true);

create or replace function public.admin_create_tournament(p_name text, p_format tournament_format, p_zone text, p_starts_at timestamptz)
returns uuid as $$
declare
  v_id uuid;
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  insert into tournaments (name, format, zone, starts_at, created_by)
  values (p_name, p_format, p_zone, p_starts_at, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_add_tournament_participant(p_tournament_id uuid, p_profile_id uuid, p_partner_id uuid default null, p_seed int default null)
returns uuid as $$
declare
  v_id uuid;
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  insert into tournament_participants (tournament_id, profile_id, partner_id, seed)
  values (p_tournament_id, p_profile_id, p_partner_id, p_seed)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_remove_tournament_participant(p_participant_id uuid)
returns void as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from tournament_participants where id = p_participant_id;
end;
$$ language plpgsql security definer;

-- Round robin: one match per unique pair of entrants, all in round 1
-- (round is meaningless for round robin — every match is independent).
create or replace function public.admin_generate_round_robin(p_tournament_id uuid)
returns void as $$
declare
  a record;
  b record;
  pos int := 0;
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from tournament_matches where tournament_id = p_tournament_id;

  for a in select id from tournament_participants where tournament_id = p_tournament_id order by created_at loop
    for b in select id from tournament_participants where tournament_id = p_tournament_id and id > a.id order by created_at loop
      pos := pos + 1;
      insert into tournament_matches (tournament_id, round, position, entrant_a_id, entrant_b_id)
      values (p_tournament_id, 1, pos, a.id, b.id);
    end loop;
  end loop;

  update tournaments set status = 'active' where id = p_tournament_id;
end;
$$ language plpgsql security definer;

-- Bracket: seed order determines round-1 pairing (1 vs n, 2 vs n-1, ...).
-- Byes are inserted for non-power-of-2 entrant counts — a bye match has no
-- entrant_b and is immediately marked 'bye' with entrant_a as the winner so
-- the next round can be generated the same way regardless of bracket size.
create or replace function public.admin_generate_bracket(p_tournament_id uuid)
returns void as $$
declare
  entrants uuid[];
  n int;
  bracket_size int := 1;
  i int;
  pos int := 0;
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  delete from tournament_matches where tournament_id = p_tournament_id;

  select array_agg(id order by coalesce(seed, 999999), created_at)
    into entrants
  from tournament_participants
  where tournament_id = p_tournament_id;

  n := array_length(entrants, 1);
  if n is null or n < 2 then
    raise exception 'Need at least 2 participants';
  end if;

  while bracket_size < n loop
    bracket_size := bracket_size * 2;
  end loop;

  i := 1;
  while i <= bracket_size loop
    pos := pos + 1;
    declare
      a uuid := entrants[i];
      b uuid := case when i + 1 <= n then entrants[i + 1] else null end;
    begin
      if b is null then
        insert into tournament_matches (tournament_id, round, position, entrant_a_id, entrant_b_id, status, winner_entrant_id)
        values (p_tournament_id, 1, pos, a, null, 'bye', a);
      else
        insert into tournament_matches (tournament_id, round, position, entrant_a_id, entrant_b_id)
        values (p_tournament_id, 1, pos, a, b);
      end if;
    end;
    i := i + 2;
  end loop;

  update tournaments set status = 'active' where id = p_tournament_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_record_tournament_result(p_match_id uuid, p_sets jsonb, p_winner_entrant_id uuid)
returns void as $$
declare
  v_tournament_id uuid;
  v_round int;
  v_position int;
  v_format tournament_format;
  v_next_round_match_id uuid;
  v_next_position int;
  v_slot text;
begin
  if not is_admin(auth.uid()) then raise exception 'Not authorized'; end if;

  update tournament_matches
  set sets = p_sets, winner_entrant_id = p_winner_entrant_id, status = 'completed'
  where id = p_match_id
  returning tournament_id, round, position into v_tournament_id, v_round, v_position;

  select format into v_format from tournaments where id = v_tournament_id;

  -- Bracket only: advance the winner into the next round's match. Two
  -- adjacent positions in a round feed into ceil(position/2) of the next
  -- round; even position -> slot B, odd -> slot A.
  if v_format = 'bracket' then
    v_next_position := ceil(v_position::numeric / 2);
    v_slot := case when v_position % 2 = 1 then 'a' else 'b' end;

    select id into v_next_round_match_id
    from tournament_matches
    where tournament_id = v_tournament_id and round = v_round + 1 and position = v_next_position;

    if v_next_round_match_id is null then
      insert into tournament_matches (tournament_id, round, position, entrant_a_id)
      values (v_tournament_id, v_round + 1, v_next_position, case when v_slot = 'a' then p_winner_entrant_id else null end)
      returning id into v_next_round_match_id;
      if v_slot = 'b' then
        update tournament_matches set entrant_b_id = p_winner_entrant_id where id = v_next_round_match_id;
      end if;
    else
      if v_slot = 'a' then
        update tournament_matches set entrant_a_id = p_winner_entrant_id where id = v_next_round_match_id;
      else
        update tournament_matches set entrant_b_id = p_winner_entrant_id where id = v_next_round_match_id;
      end if;
    end if;
  end if;
end;
$$ language plpgsql security definer;
