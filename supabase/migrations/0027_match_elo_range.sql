-- Matches now carry an explicit ELO window (set from the creator's ELO at
-- creation time) and joining is enforced server-side against it, so a much
-- stronger player can't join a casual low-ELO match (and vice versa). The
-- existing `level` column stays as a display label only.

alter table matches add column min_elo int;
alter table matches add column max_elo int;

drop policy "Users can join matches themselves" on match_players;

create policy "Users can join matches themselves"
  on match_players for insert
  to authenticated
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from matches m
      join profiles p on p.id = auth.uid()
      where m.id = match_id
      and (m.min_elo is null or p.elo >= m.min_elo)
      and (m.max_elo is null or p.elo <= m.max_elo)
    )
  );
