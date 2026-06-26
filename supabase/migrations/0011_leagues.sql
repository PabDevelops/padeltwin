-- Private leagues: a named group of players who compare themselves on a
-- shared leaderboard (ranked by their existing global ELO — no separate
-- scoring system needed for v1). Joining is via a short shareable invite
-- code, no acceptance flow needed (unlike partner_requests).
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id) on delete cascade,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table league_members (
  league_id uuid not null references leagues (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, profile_id)
);

-- Security-definer helper to avoid recursive RLS (league_members policies
-- need to check membership of the *same* table without infinite recursion).
create function is_league_member(p_league_id uuid, p_profile_id uuid)
returns boolean as $$
  select exists (
    select 1 from league_members
    where league_id = p_league_id and profile_id = p_profile_id
  );
$$ language sql security definer stable;

alter table leagues enable row level security;
alter table league_members enable row level security;

create policy "Members can view their leagues"
  on leagues for select
  to authenticated
  using (auth.uid() = created_by or is_league_member(id, auth.uid()));

create policy "Anyone authenticated can create a league"
  on leagues for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Creator can update their league"
  on leagues for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Creator can delete their league"
  on leagues for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "Members can view league membership"
  on league_members for select
  to authenticated
  using (is_league_member(league_id, auth.uid()));

create policy "Users can join a league themselves"
  on league_members for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "Users can leave a league, creator can remove members"
  on league_members for delete
  to authenticated
  using (
    auth.uid() = profile_id
    or auth.uid() = (select created_by from leagues where id = league_id)
  );

-- Creator is automatically a member of their own league.
create function add_creator_as_member()
returns trigger as $$
begin
  insert into league_members (league_id, profile_id) values (new.id, new.created_by);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_league_insert_add_creator
  after insert on leagues
  for each row execute function add_creator_as_member();
