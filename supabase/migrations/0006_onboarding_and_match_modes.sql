-- Onboarding / richer profile fields
alter table profiles add column height_cm int;
alter table profiles add column sex text check (sex in ('male', 'female', 'other'));
alter table profiles add column dominant_hand text check (dominant_hand in ('left', 'right'));
alter table profiles add column club text;
alter table profiles add column racket text;
alter table profiles add column apparel_brand text;
alter table profiles add column looking_for_partner boolean not null default true;
alter table profiles add column onboarding_completed boolean not null default false;

-- Match modes / visibility
create type match_mode as enum ('pair', 'individual');
create type match_visibility as enum ('open', 'closed');

alter table matches add column mode match_mode not null default 'individual';
alter table matches add column visibility match_visibility not null default 'open';

-- Allow a match creator to add their already-accepted partner directly
-- (needed for 'pair' mode, where the creator pre-fills their own team).
create policy "Creator can add their accepted partner to a match"
  on match_players for insert
  to authenticated
  with check (
    auth.uid() = (select created_by from matches where id = match_id)
    and exists (
      select 1 from partner_requests pr
      where pr.status = 'accepted'
        and (
          (pr.from_id = auth.uid() and pr.to_id = match_players.player_id)
          or (pr.to_id = auth.uid() and pr.from_id = match_players.player_id)
        )
    )
  );

-- Storage policies for the 'avatars' bucket.
-- NOTE: the bucket itself must be created manually in the Supabase dashboard
-- (Storage -> New bucket -> name "avatars" -> Public bucket), these policies
-- only govern who can read/write objects inside it once it exists.
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
