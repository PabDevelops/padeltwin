-- League creation becomes a Pro perk. Joining an existing league by invite
-- code stays open to everyone — only the act of starting a new one is
-- gated, same spirit as coach status gating coach-only actions elsewhere.
drop policy "Anyone authenticated can create a league" on leagues;

create policy "Pro players can create a league"
  on leagues for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and (select is_pro from profiles where id = auth.uid())
  );
