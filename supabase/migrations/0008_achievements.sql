-- Lightweight "activity & achievements" layer: system-generated milestones
-- instead of user-authored posts, so the feed never looks empty/dead and
-- needs no moderation. Awarded automatically by a trigger on match_results,
-- the same insertion point that drives the ELO trigger in 0003.
create type achievement_type as enum (
  'first_match', 'matches_5', 'matches_10', 'matches_25',
  'first_win', 'wins_5', 'wins_10', 'wins_25',
  'elo_1300', 'elo_1400', 'elo_1500'
);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  type achievement_type not null,
  created_at timestamptz not null default now(),
  unique (profile_id, type)
);

alter table achievements enable row level security;

-- Readable by anyone authenticated (it's a public activity feed). No insert/
-- update/delete policy for regular users on purpose — the only writer is the
-- security-definer trigger below, so achievements can't be faked from the client.
create policy "Achievements are viewable by authenticated users"
  on achievements for select
  to authenticated
  using (true);

create function public.maybe_award_achievement(p_profile_id uuid, p_type achievement_type)
returns void as $$
begin
  insert into achievements (profile_id, type)
  values (p_profile_id, p_type)
  on conflict (profile_id, type) do nothing;
end;
$$ language plpgsql security definer;

create function public.award_match_achievements()
returns trigger as $$
declare
  pid uuid;
  played_count int;
  won_count int;
  current_elo int;
  is_win boolean;
begin
  foreach pid in array array[new.team_a_player1, new.team_a_player2, new.team_b_player1, new.team_b_player2]
  loop
    select count(*) into played_count
    from match_results
    where pid in (team_a_player1, team_a_player2, team_b_player1, team_b_player2);

    is_win := (pid in (new.team_a_player1, new.team_a_player2) and new.winner = 'a')
           or (pid in (new.team_b_player1, new.team_b_player2) and new.winner = 'b');

    select count(*) into won_count
    from match_results
    where (pid in (team_a_player1, team_a_player2) and winner = 'a')
       or (pid in (team_b_player1, team_b_player2) and winner = 'b');

    if played_count = 1 then perform maybe_award_achievement(pid, 'first_match'); end if;
    if played_count >= 5 then perform maybe_award_achievement(pid, 'matches_5'); end if;
    if played_count >= 10 then perform maybe_award_achievement(pid, 'matches_10'); end if;
    if played_count >= 25 then perform maybe_award_achievement(pid, 'matches_25'); end if;

    if is_win and won_count = 1 then perform maybe_award_achievement(pid, 'first_win'); end if;
    if won_count >= 5 then perform maybe_award_achievement(pid, 'wins_5'); end if;
    if won_count >= 10 then perform maybe_award_achievement(pid, 'wins_10'); end if;
    if won_count >= 25 then perform maybe_award_achievement(pid, 'wins_25'); end if;

    -- Read elo AFTER apply_elo_change (0003) has already updated it. Postgres
    -- fires same-event triggers in name order, and
    -- "on_match_result_insert_achievements" sorts after "on_match_result_insert".
    select elo into current_elo from profiles where id = pid;
    if current_elo >= 1300 then perform maybe_award_achievement(pid, 'elo_1300'); end if;
    if current_elo >= 1400 then perform maybe_award_achievement(pid, 'elo_1400'); end if;
    if current_elo >= 1500 then perform maybe_award_achievement(pid, 'elo_1500'); end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_result_insert_achievements
  after insert on match_results
  for each row execute procedure public.award_match_achievements();
