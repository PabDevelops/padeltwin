-- Padel is a 2-person sport, so Leagues and KOP are joined by a ranked
-- pair, not an individual. A pair can join up to 1 league for free,
-- or up to 5 on Pro (Pro on either player counts). Same cap shape for
-- KOP club thrones. City/country leagues aren't separate rows — they're
-- identified by (kind, value), e.g. ('city', 'Edinburgh').

create table pair_leagues (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references pairs (id) on delete cascade,
  kind text not null check (kind in ('city', 'country')),
  value text not null,
  created_at timestamptz not null default now(),
  unique (pair_id, kind, value)
);

create table pair_clubs (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references pairs (id) on delete cascade,
  club text not null,
  created_at timestamptz not null default now(),
  unique (pair_id, club)
);

alter table pair_leagues enable row level security;
alter table pair_clubs enable row level security;

create policy "Pair leagues are viewable by authenticated users"
  on pair_leagues for select to authenticated using (true);

create policy "Pair clubs are viewable by authenticated users"
  on pair_clubs for select to authenticated using (true);

create policy "A pair member can leave a league"
  on pair_leagues for delete to authenticated
  using (exists (
    select 1 from pairs p where p.id = pair_leagues.pair_id
      and auth.uid() in (p.player_a_id, p.player_b_id)
  ));

create policy "A pair member can leave a club"
  on pair_clubs for delete to authenticated
  using (exists (
    select 1 from pairs p where p.id = pair_clubs.pair_id
      and auth.uid() in (p.player_a_id, p.player_b_id)
  ));

-- Inserts go through these RPCs so the free/pro cap can't be bypassed by
-- a direct client insert.

create or replace function public.join_pair_league(p_pair_id uuid, p_kind text, p_value text)
returns void as $$
declare
  v_self uuid := auth.uid();
  v_is_pro boolean;
  v_count int;
  v_cap int;
begin
  if not exists (
    select 1 from pairs where id = p_pair_id and v_self in (player_a_id, player_b_id)
  ) then
    raise exception 'Not a member of this pair';
  end if;

  select exists (
    select 1 from pairs p
    join profiles pa on pa.id = p.player_a_id
    join profiles pb on pb.id = p.player_b_id
    where p.id = p_pair_id and (pa.is_pro or pb.is_pro)
  ) into v_is_pro;

  select count(*) into v_count from pair_leagues where pair_id = p_pair_id;
  v_cap := case when v_is_pro then 5 else 1 end;
  if v_count >= v_cap then
    raise exception 'This pair already joined % league(s) — free pairs get 1, Pro gets up to 5', v_cap;
  end if;

  insert into pair_leagues (pair_id, kind, value) values (p_pair_id, p_kind, p_value)
  on conflict (pair_id, kind, value) do nothing;
end;
$$ language plpgsql security definer;

create or replace function public.join_pair_club(p_pair_id uuid, p_club text)
returns void as $$
declare
  v_self uuid := auth.uid();
  v_is_pro boolean;
  v_count int;
  v_cap int;
begin
  if not exists (
    select 1 from pairs where id = p_pair_id and v_self in (player_a_id, player_b_id)
  ) then
    raise exception 'Not a member of this pair';
  end if;

  select exists (
    select 1 from pairs p
    join profiles pa on pa.id = p.player_a_id
    join profiles pb on pb.id = p.player_b_id
    where p.id = p_pair_id and (pa.is_pro or pb.is_pro)
  ) into v_is_pro;

  select count(*) into v_count from pair_clubs where pair_id = p_pair_id;
  v_cap := case when v_is_pro then 5 else 1 end;
  if v_count >= v_cap then
    raise exception 'This pair already joined % club(s) — free pairs get 1, Pro gets up to 5', v_cap;
  end if;

  insert into pair_clubs (pair_id, club) values (p_pair_id, p_club)
  on conflict (pair_id, club) do nothing;
end;
$$ language plpgsql security definer;
