-- Phase 1 of the social layer: user-generated posts (photo + caption,
-- optionally linked to one of the poster's own matches), the missing
-- piece that turns the activity feed from auto-generated events
-- (achievements, match results) into something people actually post to.

create table posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  match_id uuid references matches (id) on delete set null,
  photo_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index posts_profile_idx on posts (profile_id, created_at desc);
create index posts_created_idx on posts (created_at desc);

alter table posts enable row level security;

create policy "Posts are viewable by authenticated users"
  on posts for select
  to authenticated
  using (true);

create policy "Users can create their own posts"
  on posts for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "Users can delete their own posts"
  on posts for delete
  to authenticated
  using (profile_id = auth.uid());

-- Storage bucket for post photos — public read (same pattern as avatars),
-- writes restricted to the user's own folder (storage path: {userId}/{file}).
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

create policy "Post photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'posts');

create policy "Users can upload their own post photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own post photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Reuse the existing kudos system (vibs) for post likes.
alter type vib_item_type add value if not exists 'post';

-- Extend the vib notification trigger to cover posts (own-er = profile_id).
create or replace function public.notify_new_vib()
returns trigger as $$
declare
  v_owner uuid;
  v_token text;
  v_vibber_name text;
begin
  select full_name into v_vibber_name from profiles where id = new.profile_id;

  if new.item_type = 'achievement' then
    select profile_id into v_owner from achievements where id = new.item_id;
    if v_owner is not null and v_owner <> new.profile_id then
      select push_token into v_token from profiles where id = v_owner;
      perform send_push_notification(
        v_token,
        'New Vib',
        coalesce(v_vibber_name, 'Someone') || ' gave your achievement a Vib.',
        jsonb_build_object('type', 'vib', 'itemType', 'achievement', 'itemId', new.item_id)
      );
      perform insert_notification(
        v_owner,
        'vib',
        'New Vib',
        coalesce(v_vibber_name, 'Someone') || ' gave your achievement a Vib.',
        jsonb_build_object('itemType', 'achievement', 'itemId', new.item_id)
      );
    end if;
  elsif new.item_type = 'match_result' then
    for v_owner in
      select unnest(array[team_a_player1, team_a_player2, team_b_player1, team_b_player2])
      from match_results
      where id = new.item_id
    loop
      if v_owner <> new.profile_id then
        select push_token into v_token from profiles where id = v_owner;
        perform send_push_notification(
          v_token,
          'New Vib',
          coalesce(v_vibber_name, 'Someone') || ' gave your match a Vib.',
          jsonb_build_object('type', 'vib', 'itemType', 'match_result', 'itemId', new.item_id)
        );
        perform insert_notification(
          v_owner,
          'vib',
          'New Vib',
          coalesce(v_vibber_name, 'Someone') || ' gave your match a Vib.',
          jsonb_build_object('itemType', 'match_result', 'itemId', new.item_id)
        );
      end if;
    end loop;
  elsif new.item_type = 'post' then
    select profile_id into v_owner from posts where id = new.item_id;
    if v_owner is not null and v_owner <> new.profile_id then
      select push_token into v_token from profiles where id = v_owner;
      perform send_push_notification(
        v_token,
        'New Vib',
        coalesce(v_vibber_name, 'Someone') || ' liked your post.',
        jsonb_build_object('type', 'vib', 'itemType', 'post', 'itemId', new.item_id)
      );
      perform insert_notification(
        v_owner,
        'vib',
        'New Vib',
        coalesce(v_vibber_name, 'Someone') || ' liked your post.',
        jsonb_build_object('itemType', 'post', 'itemId', new.item_id)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;
