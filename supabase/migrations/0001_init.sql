-- Enums
create type player_level as enum ('iniciacion', 'intermedio', 'avanzado');
create type match_status as enum ('open', 'full', 'cancelled');

-- Profiles (mirrors auth.users)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  level player_level,
  zone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles (id) on delete cascade,
  date_time timestamptz not null,
  location text not null,
  level player_level not null,
  max_players int not null default 4,
  status match_status not null default 'open',
  created_at timestamptz not null default now()
);

-- Match players (join table)
create table match_players (
  match_id uuid not null references matches (id) on delete cascade,
  player_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

-- Keep match status in sync with player count
create function public.sync_match_status()
returns trigger as $$
declare
  current_count int;
  capacity int;
begin
  select max_players into capacity from matches where id = coalesce(new.match_id, old.match_id);
  select count(*) into current_count from match_players where match_id = coalesce(new.match_id, old.match_id);

  update matches
  set status = case when current_count >= capacity then 'full' else 'open' end
  where id = coalesce(new.match_id, old.match_id) and status <> 'cancelled';

  return null;
end;
$$ language plpgsql security definer;

create trigger on_match_players_change
  after insert or delete on match_players
  for each row execute procedure public.sync_match_status();

-- Prevent joining a full or cancelled match
create function public.check_match_capacity()
returns trigger as $$
declare
  current_count int;
  capacity int;
  match_state match_status;
begin
  select max_players, status into capacity, match_state from matches where id = new.match_id;

  if match_state <> 'open' then
    raise exception 'Match is not open for joining';
  end if;

  select count(*) into current_count from match_players where match_id = new.match_id;

  if current_count >= capacity then
    raise exception 'Match is full';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger before_match_player_insert
  before insert on match_players
  for each row execute procedure public.check_match_capacity();

-- Row Level Security
alter table profiles enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;

-- Profiles: readable by any authenticated user, editable only by owner
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Matches: readable by any authenticated user
create policy "Matches are viewable by authenticated users"
  on matches for select
  to authenticated
  using (true);

create policy "Users can create matches"
  on matches for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Creators can update their own matches"
  on matches for update
  to authenticated
  using (auth.uid() = created_by);

create policy "Creators can delete their own matches"
  on matches for delete
  to authenticated
  using (auth.uid() = created_by);

-- Match players: readable by any authenticated user
create policy "Match players are viewable by authenticated users"
  on match_players for select
  to authenticated
  using (true);

create policy "Users can join matches themselves"
  on match_players for insert
  to authenticated
  with check (auth.uid() = player_id);

create policy "Users can leave matches themselves"
  on match_players for delete
  to authenticated
  using (auth.uid() = player_id);
