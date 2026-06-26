-- Enums
create type request_status as enum ('pending', 'accepted', 'rejected');

-- Partner requests (one player asking to connect with another)
create table partner_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles (id) on delete cascade,
  to_id uuid not null references profiles (id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint partner_requests_not_self check (from_id <> to_id),
  constraint partner_requests_unique_pair unique (from_id, to_id)
);

-- Messages (only meaningful once the related request is accepted)
create table messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references partner_requests (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table partner_requests enable row level security;
alter table messages enable row level security;

-- Partner requests: only the two parties involved can see a request
create policy "Participants can view their partner requests"
  on partner_requests for select
  to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "Users can send partner requests"
  on partner_requests for insert
  to authenticated
  with check (auth.uid() = from_id);

create policy "Recipients can respond to partner requests"
  on partner_requests for update
  to authenticated
  using (auth.uid() = to_id)
  with check (auth.uid() = to_id);

-- Messages: only readable/sendable by the two parties of an accepted request
create policy "Participants can view messages of accepted requests"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from partner_requests pr
      where pr.id = messages.request_id
        and pr.status = 'accepted'
        and (pr.from_id = auth.uid() or pr.to_id = auth.uid())
    )
  );

create policy "Participants can send messages on accepted requests"
  on messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from partner_requests pr
      where pr.id = messages.request_id
        and pr.status = 'accepted'
        and (pr.from_id = auth.uid() or pr.to_id = auth.uid())
    )
  );

-- Enable Realtime on messages
alter publication supabase_realtime add table messages;
