-- Adds Premier League and Champions League as active competitions, both via
-- the existing football-data.org provider (no new adapter needed — the
-- sync-fixtures loop added in 0004 already fans out over every active
-- `competitions` row). See docs/rollout/FOOTBALL_MVP.md rollout stage 3.
--
-- Season '2026' follows the same football-data.org convention already used
-- for WC2026 in 0004: the year a season starts (English football/UEFA
-- seasons run Aug-May, so '2026' means the 2026-27 season).
--
-- DRAFT: not yet applied to production. Apply via the Supabase SQL editor
-- the same way 0004 was applied.

insert into public.competitions (code, name, season, provider, provider_code, is_active)
values
  ('PL2026', 'Premier League', '2026', 'football-data', 'PL', true),
  ('CL2026', 'UEFA Champions League', '2026', 'football-data', 'CL', true)
on conflict (code) do nothing;
