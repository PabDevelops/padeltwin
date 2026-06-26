-- Allow either party of a partner_request to delete it (i.e. "delete chat").
-- Messages cascade-delete automatically via messages.request_id on delete cascade.
create policy "Participants can delete their partner requests"
  on partner_requests for delete
  to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);
