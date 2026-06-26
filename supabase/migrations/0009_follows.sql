-- Lightweight one-directional "follow" relationship, separate from
-- partner_requests (which is a mutual accept/decline flow for arranging to
-- actually play together). Follows just control whose activity shows up in
-- your feed — no acceptance needed, like a social network follow.
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followed_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table follows enable row level security;

create policy "Follows are viewable by authenticated users"
  on follows for select
  to authenticated
  using (true);

create policy "Users can follow others"
  on follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete
  to authenticated
  using (auth.uid() = follower_id);
