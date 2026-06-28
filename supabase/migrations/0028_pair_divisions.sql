-- Pairs become a persistent ranked entity, separate from individual ELO.
-- Free players can declare up to 2 ranked pairs; Pro removes the cap.
-- A pair's ELO only moves when its two exact members win/lose together in
-- a confirmed pair-mode match result.

create table pairs (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references profiles (id) on delete cascade,
  player_b_id uuid not null references profiles (id) on delete cascade,
  elo int not null default 1200,
  matches_played int not null default 0,
  created_at timestamptz not null default now(),
  constraint pairs_ordered check (player_a_id < player_b_id),
  unique (player_a_id, player_b_id)
);

alter table pairs enable row level security;

create policy "Pairs are viewable by authenticated users"
  on pairs for select
  to authenticated
  using (true);

-- All writes go through declare_pair() / the match-result trigger below —
-- no direct insert/update/delete policies for clients.

create or replace function public.declare_pair(p_partner_id uuid)
returns uuid as $$
declare
  v_self uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_pair_count int;
  v_is_pro boolean;
  v_starting_elo int;
  v_id uuid;
begin
  if p_partner_id = v_self then
    raise exception 'Cannot pair with yourself';
  end if;

  if not exists (
    select 1 from partner_requests pr
    where pr.status = 'accepted'
      and ((pr.from_id = v_self and pr.to_id = p_partner_id) or (pr.to_id = v_self and pr.from_id = p_partner_id))
  ) then
    raise exception 'You must be accepted partners first';
  end if;

  select is_pro into v_is_pro from profiles where id = v_self;
  select count(*) into v_pair_count from pairs where v_self in (player_a_id, player_b_id);
  if not v_is_pro and v_pair_count >= 2 then
    raise exception 'Free accounts can declare up to 2 ranked pairs — upgrade to Pro for unlimited pairs';
  end if;

  v_a := least(v_self, p_partner_id);
  v_b := greatest(v_self, p_partner_id);

  select round(avg(elo)) into v_starting_elo from profiles where id in (v_a, v_b);

  insert into pairs (player_a_id, player_b_id, elo)
  values (v_a, v_b, coalesce(v_starting_elo, 1200))
  on conflict (player_a_id, player_b_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from pairs where player_a_id = v_a and player_b_id = v_b;
  end if;

  return v_id;
end;
$$ language plpgsql security definer;

create or replace function public.apply_pair_elo_change()
returns trigger as $$
declare
  pair_a record;
  pair_b record;
  rating_a numeric;
  rating_b numeric;
  expected_a numeric;
  actual_a numeric;
  games_a int := 0;
  games_b int := 0;
  set_row jsonb;
  mov_multiplier numeric;
  base_change_a numeric;
  k_pair numeric;
  delta int;
begin
  select * into pair_a from pairs
    where (player_a_id = least(new.team_a_player1, new.team_a_player2) and player_b_id = greatest(new.team_a_player1, new.team_a_player2));
  select * into pair_b from pairs
    where (player_a_id = least(new.team_b_player1, new.team_b_player2) and player_b_id = greatest(new.team_b_player1, new.team_b_player2));

  if pair_a is null and pair_b is null then
    return new;
  end if;

  rating_a := coalesce(pair_a.elo, (select avg(elo) from profiles where id in (new.team_a_player1, new.team_a_player2)));
  rating_b := coalesce(pair_b.elo, (select avg(elo) from profiles where id in (new.team_b_player1, new.team_b_player2)));

  expected_a := 1.0 / (1.0 + power(10.0, (rating_b - rating_a) / 400.0));
  actual_a := case when new.winner = 'a' then 1.0 else 0.0 end;

  for set_row in select * from jsonb_array_elements(new.sets) loop
    games_a := games_a + (set_row->>'a')::int;
    games_b := games_b + (set_row->>'b')::int;
  end loop;

  mov_multiplier := least(1.5, 1 + abs(games_a - games_b)::numeric / 20);
  base_change_a := mov_multiplier * (actual_a - expected_a);

  if pair_a is not null then
    k_pair := case when pair_a.matches_played < 5 then 48 else 32 end;
    delta := round(k_pair * base_change_a);
    update pairs set elo = elo + delta, matches_played = matches_played + 1 where id = pair_a.id;
  end if;

  if pair_b is not null then
    k_pair := case when pair_b.matches_played < 5 then 48 else 32 end;
    delta := round(k_pair * (-base_change_a));
    update pairs set elo = elo + delta, matches_played = matches_played + 1 where id = pair_b.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_result_confirm_pair_elo
  after update on match_results
  for each row
  when (old.status = 'pending' and new.status = 'confirmed')
  execute procedure public.apply_pair_elo_change();
