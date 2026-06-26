-- ELO rating on profiles
alter table profiles add column elo integer not null default 1200;

-- Team enum
create type match_team as enum ('a', 'b');

-- Match results (one per match, sets as jsonb array of {a:int,b:int})
create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade unique,
  team_a_player1 uuid not null references profiles (id) on delete cascade,
  team_a_player2 uuid not null references profiles (id) on delete cascade,
  team_b_player1 uuid not null references profiles (id) on delete cascade,
  team_b_player2 uuid not null references profiles (id) on delete cascade,
  sets jsonb not null,
  winner match_team not null,
  recorded_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table match_results enable row level security;

create policy "Participants can view their match result"
  on match_results for select
  to authenticated
  using (
    auth.uid() in (team_a_player1, team_a_player2, team_b_player1, team_b_player2)
  );

create policy "Participants can record their match result"
  on match_results for insert
  to authenticated
  with check (
    recorded_by = auth.uid()
    and auth.uid() in (team_a_player1, team_a_player2, team_b_player1, team_b_player2)
    and (
      select count(*) from match_players mp
      where mp.match_id = match_results.match_id
        and mp.player_id in (team_a_player1, team_a_player2, team_b_player1, team_b_player2)
    ) = 4
  );

-- ELO calculation trigger: K=32, team rating = average of its two players
create function public.apply_elo_change()
returns trigger as $$
declare
  rating_a numeric;
  rating_b numeric;
  expected_a numeric;
  actual_a numeric;
  delta_a integer;
  k constant numeric := 32;
begin
  select avg(elo) into rating_a from profiles where id in (new.team_a_player1, new.team_a_player2);
  select avg(elo) into rating_b from profiles where id in (new.team_b_player1, new.team_b_player2);

  expected_a := 1.0 / (1.0 + power(10.0, (rating_b - rating_a) / 400.0));
  actual_a := case when new.winner = 'a' then 1.0 else 0.0 end;
  delta_a := round(k * (actual_a - expected_a));

  update profiles set elo = elo + delta_a where id in (new.team_a_player1, new.team_a_player2);
  update profiles set elo = elo - delta_a where id in (new.team_b_player1, new.team_b_player2);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_result_insert
  after insert on match_results
  for each row execute procedure public.apply_elo_change();
