-- Coach marketplace v1. Any player can opt into being a listed coach
-- (self-serve, no admin approval needed for v1). Monetization for now is
-- manual: `coach_featured` is a lever only flipped via SQL by us, to put a
-- coach at the top of the directory in exchange for payment outside the
-- app — same model as most early marketplaces before in-app billing.
-- Real payment/booking happens off-platform for now; the app's job is to
-- generate qualified leads for the coach.
alter table profiles add column is_coach boolean not null default false;
alter table profiles add column coach_bio text;
alter table profiles add column coach_hourly_rate numeric;
alter table profiles add column coach_years_experience int;
alter table profiles add column coach_specialties text;
alter table profiles add column coach_featured boolean not null default false;

create table coach_leads (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles (id) on delete cascade,
  requester_id uuid not null references profiles (id) on delete cascade,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table coach_leads enable row level security;

create policy "Coach and requester can view a lead"
  on coach_leads for select
  to authenticated
  using (auth.uid() = coach_id or auth.uid() = requester_id);

create policy "Players can send a lead to a coach"
  on coach_leads for insert
  to authenticated
  with check (auth.uid() = requester_id and coach_id <> requester_id);

create policy "Coach can update lead status"
  on coach_leads for update
  to authenticated
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- New lead -> notify the coach immediately (this is the whole point: fast
-- response time is what makes a lead-gen feature actually useful to Antonio).
create or replace function notify_new_coach_lead()
returns trigger as $$
declare
  v_recipient_token text;
  v_requester_name text;
begin
  select push_token into v_recipient_token from profiles where id = new.coach_id;
  select full_name into v_requester_name from profiles where id = new.requester_id;

  perform send_push_notification(
    v_recipient_token,
    'New lesson request',
    coalesce(v_requester_name, 'A player') || ' wants to book a lesson with you.',
    jsonb_build_object('type', 'coach_lead', 'leadId', new.id)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_coach_lead_insert_notify
  after insert on coach_leads
  for each row execute function notify_new_coach_lead();
