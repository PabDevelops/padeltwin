-- Cascade deletes are still subject to RLS in Postgres: deleting a
-- partner_requests row cascades to its messages, but that cascade was
-- being blocked because messages had no DELETE policy at all, making
-- "delete chat" fail entirely. Allow either participant to delete.
create policy "Participants can delete their messages"
  on messages for delete
  to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from partner_requests pr
      where pr.id = messages.request_id
        and (pr.from_id = auth.uid() or pr.to_id = auth.uid())
    )
  );
