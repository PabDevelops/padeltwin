-- Safety baseline required before any public listing: blocking, reporting,
-- and self-serve account deletion (UK GDPR / App Store & Play Store policy
-- for apps with user-generated content).

-- ---- Blocking ----
-- One-directional like `follows`, but the effect is the opposite: a block
-- hides the blocked person from the blocker's discovery surfaces and stops
-- new partner requests between the two, in either direction.
create table blocked_users (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table blocked_users enable row level security;

create policy "Users can view their own block list"
  on blocked_users for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "Users can block someone"
  on blocked_users for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "Users can unblock someone"
  on blocked_users for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- Enforce at the DB level too: no new partner request can be created if
-- either side has blocked the other (existing accepted connections are left
-- alone — blocking doesn't retroactively nuke an existing relationship,
-- it only stops new contact and hides discovery, same as most apps).
create or replace function public.enforce_no_partner_request_if_blocked()
returns trigger as $$
begin
  if exists (
    select 1 from blocked_users
    where (blocker_id = new.from_id and blocked_id = new.to_id)
       or (blocker_id = new.to_id and blocked_id = new.from_id)
  ) then
    raise exception 'Cannot send a partner request — blocked.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_partner_request_insert_block_check
  before insert on partner_requests
  for each row execute procedure public.enforce_no_partner_request_if_blocked();

-- ---- Reporting ----
-- Reports are intentionally write-only from the client (insert + read your
-- own) — there's no admin UI yet, so review happens by us querying this
-- table directly in the SQL editor, same "manual until volume justifies a
-- tool" pattern as coach review (0017).
create type report_target_type as enum ('profile', 'match', 'match_result');

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "Users can view their own submitted reports"
  on reports for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "Users can submit a report"
  on reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- ---- Account deletion ----
-- Self-serve delete: removes the profile row (cascades to almost everything
-- else via existing FK on delete cascade — matches, messages, follows,
-- achievements, league memberships, etc.) and then the auth.users row
-- itself. security definer is required for the auth.users delete — a plain
-- authenticated client has no privilege to touch that table directly.
create or replace function public.delete_my_account()
returns void as $$
begin
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer;

grant execute on function public.delete_my_account() to authenticated;
