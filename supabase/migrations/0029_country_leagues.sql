-- Official leagues replace the old private invite-code leagues: instead of
-- a closed group you create and invite people into, a "league" is now just
-- everyone in your city or country, ranked by their existing PS Score.
-- No new tables needed — only a place to store which country a player is
-- in, since `zone` already covers the city.
alter table profiles add column country text;
