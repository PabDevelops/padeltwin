-- Fix: CASE branches were inferred as text, which fails to assign to the
-- match_status enum column. Cast each branch explicitly.
create or replace function public.sync_match_status()
returns trigger as $$
declare
  current_count int;
  capacity int;
begin
  select max_players into capacity from matches where id = coalesce(new.match_id, old.match_id);
  select count(*) into current_count from match_players where match_id = coalesce(new.match_id, old.match_id);

  update matches
  set status = case when current_count >= capacity then 'full'::match_status else 'open'::match_status end
  where id = coalesce(new.match_id, old.match_id) and status <> 'cancelled';

  return null;
end;
$$ language plpgsql security definer;
