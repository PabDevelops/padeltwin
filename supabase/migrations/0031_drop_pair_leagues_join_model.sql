-- Correction to 0030: there is exactly ONE league per country, and a pair
-- doesn't "join" it — it's automatically theirs based on their verified
-- country. Divisions (computed client-side from pair elo, see
-- lib/pairDivisions.ts) are what organize the ranking inside that single
-- league into tiers. A player who wants to show up in another country's
-- league does so by declaring a different pair there, capped at the
-- pair-declaration limit (2 free / unlimited Pro) — not by "joining" more
-- leagues with the same pair. So the join/cap mechanism from 0030 for
-- leagues (not KOP clubs, which keep their own join model) is removed.

drop function if exists public.join_pair_league(uuid, text, text);
drop table if exists pair_leagues;
