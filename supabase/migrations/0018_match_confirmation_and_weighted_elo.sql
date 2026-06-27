-- Phase 1 of the ranking-trust work: a submitted score sheet is no longer
-- applied to ELO on insert. It sits as 'pending' until someone on the
-- opposing team confirms it (ELO applies) or disputes it (frozen, resolved
-- manually for now — same "manual until volume justifies a tool" pattern
-- already used for coach review in 0017).
create type result_status as enum ('pending', 'confirmed', 'disputed');

alter table match_results add column status result_status not null default 'pending';
alter table match_results add column confirmed_by uuid references profiles (id);
alter table match_results add column confirmed_at timestamptz;
alter table match_results add column disputed_by uuid references profiles (id);
alter table match_results add column disputed_at timestamptz;

-- Defense in depth: the confirm/dispute UPDATE below only ever needs to touch
-- status + confirmed/disputed_by/at. Block any attempt to also smuggle in a
-- changed score, winner or roster through that same request.
create function public.protect_match_result_fields()
returns trigger as $$
begin
  if new.match_id <> old.match_id
     or new.team_a_player1 <> old.team_a_player1
     or new.team_a_player2 <> old.team_a_player2
     or new.team_b_player1 <> old.team_b_player1
     or new.team_b_player2 <> old.team_b_player2
     or new.sets <> old.sets
     or new.winner <> old.winner
     or new.recorded_by <> old.recorded_by
  then
    raise exception 'Cannot modify the score sheet after submission';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger protect_match_result_fields_trigger
  before update on match_results
  for each row execute procedure public.protect_match_result_fields();

drop policy "Participants can record their match result" on match_results;
create policy "Participants can record their match result"
  on match_results for insert
  to authenticated
  with check (
    recorded_by = auth.uid()
    and status = 'pending'
    and auth.uid() in (team_a_player1, team_a_player2, team_b_player1, team_b_player2)
    and (
      select count(*) from match_players mp
      where mp.match_id = match_results.match_id
        and mp.player_id in (team_a_player1, team_a_player2, team_b_player1, team_b_player2)
    ) = 4
  );

create policy "Opposing team can confirm or dispute a pending result"
  on match_results for update
  to authenticated
  using (
    status = 'pending'
    and (
      (recorded_by in (team_a_player1, team_a_player2) and auth.uid() in (team_b_player1, team_b_player2))
      or
      (recorded_by in (team_b_player1, team_b_player2) and auth.uid() in (team_a_player1, team_a_player2))
    )
  )
  with check (
    (status = 'confirmed' and confirmed_by = auth.uid())
    or
    (status = 'disputed' and disputed_by = auth.uid())
  );

-- ELO trigger moves from insert to the pending -> confirmed transition, and
-- the flat/shared delta is replaced with two adjustments a chess-style Elo
-- doesn't need because chess is 1v1 with no margin of victory:
--
-- 1. Margin of victory: a blowout says more about the gap between teams than
--    a 7-6 nailbiter, so it should move ratings more.
-- 2. Proportional split within a team: today both teammates get the exact
--    same delta. That lets a weak player "ride" a strong partner's wins
--    straight up the leaderboard without improving. Instead, each player's
--    share of the team's delta is weighted by how far their own rating sits
--    from their team's average — the stronger half of a mismatched pair
--    absorbs most of the movement, since the result mostly reflects them.
create or replace function public.apply_elo_change()
returns trigger as $$
declare
  rating_a numeric;
  rating_b numeric;
  expected_a numeric;
  actual_a numeric;
  games_a int := 0;
  games_b int := 0;
  set_row jsonb;
  mov_multiplier numeric;
  base_change_a numeric;
  pid uuid;
  player_elo numeric;
  played_count int;
  k_player numeric;
  team_avg numeric;
  weight numeric;
  delta int;
begin
  select avg(elo) into rating_a from profiles where id in (new.team_a_player1, new.team_a_player2);
  select avg(elo) into rating_b from profiles where id in (new.team_b_player1, new.team_b_player2);

  expected_a := 1.0 / (1.0 + power(10.0, (rating_b - rating_a) / 400.0));
  actual_a := case when new.winner = 'a' then 1.0 else 0.0 end;

  for set_row in select * from jsonb_array_elements(new.sets) loop
    games_a := games_a + (set_row->>'a')::int;
    games_b := games_b + (set_row->>'b')::int;
  end loop;

  mov_multiplier := least(1.5, 1 + abs(games_a - games_b)::numeric / 20);
  base_change_a := mov_multiplier * (actual_a - expected_a);

  foreach pid in array array[new.team_a_player1, new.team_a_player2, new.team_b_player1, new.team_b_player2]
  loop
    select elo into player_elo from profiles where id = pid;

    select count(*) into played_count
    from match_results
    where status = 'confirmed'
      and pid in (team_a_player1, team_a_player2, team_b_player1, team_b_player2);

    k_player := case when played_count < 5 then 48 else 32 end;
    team_avg := case when pid in (new.team_a_player1, new.team_a_player2) then rating_a else rating_b end;
    weight := 1 + tanh((player_elo - team_avg) / 400.0);

    if pid in (new.team_a_player1, new.team_a_player2) then
      delta := round(k_player * base_change_a * weight);
    else
      delta := round(k_player * (-base_change_a) * weight);
    end if;

    update profiles set elo = elo + delta where id = pid;
  end loop;

  return new;
end;
$$ language plpgsql security definer;

drop trigger on_match_result_insert on match_results;
create trigger on_match_result_confirm
  after update on match_results
  for each row
  when (old.status = 'pending' and new.status = 'confirmed')
  execute procedure public.apply_elo_change();

-- Achievements move to the same confirm transition, and only count confirmed
-- results — a pending or disputed result shouldn't unlock milestones.
create or replace function public.award_match_achievements()
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
    where status = 'confirmed'
      and pid in (team_a_player1, team_a_player2, team_b_player1, team_b_player2);

    is_win := (pid in (new.team_a_player1, new.team_a_player2) and new.winner = 'a')
           or (pid in (new.team_b_player1, new.team_b_player2) and new.winner = 'b');

    select count(*) into won_count
    from match_results
    where status = 'confirmed'
      and ((pid in (team_a_player1, team_a_player2) and winner = 'a')
       or (pid in (team_b_player1, team_b_player2) and winner = 'b'));

    if played_count = 1 then perform maybe_award_achievement(pid, 'first_match'); end if;
    if played_count >= 5 then perform maybe_award_achievement(pid, 'matches_5'); end if;
    if played_count >= 10 then perform maybe_award_achievement(pid, 'matches_10'); end if;
    if played_count >= 25 then perform maybe_award_achievement(pid, 'matches_25'); end if;

    if is_win and won_count = 1 then perform maybe_award_achievement(pid, 'first_win'); end if;
    if won_count >= 5 then perform maybe_award_achievement(pid, 'wins_5'); end if;
    if won_count >= 10 then perform maybe_award_achievement(pid, 'wins_10'); end if;
    if won_count >= 25 then perform maybe_award_achievement(pid, 'wins_25'); end if;

    select elo into current_elo from profiles where id = pid;
    if current_elo >= 1300 then perform maybe_award_achievement(pid, 'elo_1300'); end if;
    if current_elo >= 1400 then perform maybe_award_achievement(pid, 'elo_1400'); end if;
    if current_elo >= 1500 then perform maybe_award_achievement(pid, 'elo_1500'); end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger on_match_result_insert_achievements on match_results;
create trigger on_match_result_confirm_achievements
  after update on match_results
  for each row
  when (old.status = 'pending' and new.status = 'confirmed')
  execute procedure public.award_match_achievements();

-- Leaderboard eligibility (0007) only counted total rows; now it must only
-- count confirmed ones, otherwise a pile of pending/disputed results would
-- wrongly unlock a player's place on the public leaderboard.
create or replace function public.leaderboard_profiles()
returns setof profiles as $$
  select p.*
  from profiles p
  where (
    select count(*)
    from match_results r
    where r.status = 'confirmed'
      and p.id in (r.team_a_player1, r.team_a_player2, r.team_b_player1, r.team_b_player2)
  ) >= 5;
$$ language sql security definer stable;

-- Notify the opposing team that a score sheet is waiting for them, and
-- notify the submitter once it's confirmed or disputed — same pg_net pattern
-- as the rest of 0014.
create or replace function public.notify_match_result_pending()
returns trigger as $$
declare
  v_recorder_in_a boolean;
  v_opponent uuid;
  v_recorder_name text;
begin
  v_recorder_in_a := new.recorded_by in (new.team_a_player1, new.team_a_player2);
  select full_name into v_recorder_name from profiles where id = new.recorded_by;

  for v_opponent in select unnest(
    case when v_recorder_in_a
      then array[new.team_b_player1, new.team_b_player2]
      else array[new.team_a_player1, new.team_a_player2]
    end
  )
  loop
    perform send_push_notification(
      (select push_token from profiles where id = v_opponent),
      'Score sheet awaiting confirmation',
      coalesce(v_recorder_name, 'A player') || ' submitted a result for your match. Confirm or dispute it.',
      jsonb_build_object('type', 'result_pending', 'matchId', new.match_id)
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_result_insert_notify
  after insert on match_results
  for each row execute procedure public.notify_match_result_pending();

create or replace function public.notify_match_result_confirmed_or_disputed()
returns trigger as $$
declare
  v_recorder_token text;
begin
  if old.status = 'pending' and new.status = 'confirmed' then
    select push_token into v_recorder_token from profiles where id = new.recorded_by;
    perform send_push_notification(v_recorder_token, 'Result confirmed', 'Your match result was confirmed and ELO has been updated.', jsonb_build_object('type', 'result_confirmed', 'matchId', new.match_id));
  elsif old.status = 'pending' and new.status = 'disputed' then
    select push_token into v_recorder_token from profiles where id = new.recorded_by;
    perform send_push_notification(v_recorder_token, 'Result disputed', 'Your submitted result was disputed by the other team.', jsonb_build_object('type', 'result_disputed', 'matchId', new.match_id));
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_result_update_notify
  after update on match_results
  for each row execute procedure public.notify_match_result_confirmed_or_disputed();
