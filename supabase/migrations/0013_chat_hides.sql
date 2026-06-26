-- "Delete chat" should only hide it for the user who deleted it — the other
-- participant keeps full access (like WhatsApp's per-device delete, not a
-- shared delete). So instead of deleting partner_requests/messages, we
-- record a per-user hide flag and filter it out client-side.
create table chat_hides (
  request_id uuid not null references partner_requests (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (request_id, profile_id)
);

alter table chat_hides enable row level security;

create policy "Users can view their own hidden chats"
  on chat_hides for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "Users can hide a chat for themselves"
  on chat_hides for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "Users can unhide their own chat"
  on chat_hides for delete
  to authenticated
  using (auth.uid() = profile_id);
