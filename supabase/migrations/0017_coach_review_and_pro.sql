-- Two changes to the coach marketplace:
-- 1. Becoming a coach now goes through manual review instead of being
--    instantly self-serve — players apply, status starts 'pending', and
--    only shows in the directory once we flip it to 'approved' via SQL.
--    No admin UI yet, this is intentionally manual until volume justifies one.
-- 2. Applying requires `is_pro` — a placeholder subscription flag, manually
--    toggled via SQL for now (same pattern as coach_featured) until
--    RevenueCat is wired up. is_pro will become the real subscription gate
--    for all premium features, not just coaching.
alter table profiles add column is_pro boolean not null default false;
alter table profiles add column coach_status text not null default 'none'
  check (coach_status in ('none', 'pending', 'approved', 'rejected'));

-- Backfill: anyone already marked is_coach=true (from the old self-serve
-- flow) is grandfathered in as approved.
update profiles set coach_status = 'approved' where is_coach = true;

-- Enforce the is_pro requirement at the database level too — the client
-- check is just UX, this is what actually stops a non-pro user from
-- applying by calling the API directly.
create or replace function enforce_coach_application_requires_pro()
returns trigger as $$
begin
  if new.coach_status = 'pending' and old.coach_status is distinct from 'pending' and not new.is_pro then
    raise exception 'Becoming a coach requires a Pro subscription.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_profile_update_enforce_coach_pro
  before update on profiles
  for each row execute function enforce_coach_application_requires_pro();
