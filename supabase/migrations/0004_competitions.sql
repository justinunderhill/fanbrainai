-- Competitions: lets matches belong to a named competition (Premier League,
-- Champions League, South African Premiership, ...) instead of assuming a
-- single global tournament. Additive only — existing World Cup rows are
-- backfilled into a WC2026 competitions row, nothing is deleted or renamed.
-- See docs/architecture/DATA_MODEL.md for the full design rationale.
--
-- DRAFT: not yet applied to production. Apply via the Supabase SQL editor,
-- the same way 0001-0003 were applied, when starting the football expansion.

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  season text not null,
  provider text not null,
  provider_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.competitions enable row level security;
create policy "Public can read competitions" on public.competitions for select using (true);
grant select on public.competitions to anon, authenticated;

-- Backfill: one row representing the World Cup 2026 tournament already synced.
-- Left active so the new per-competition sync loop still exercises a real
-- provider call against it (the tournament is over, so this is a no-op most
-- runs — a cheap ongoing regression check, not wasted work). Flip to false
-- once PL/CL/PSL are live and WC2026 no longer needs polling.
insert into public.competitions (code, name, season, provider, provider_code, is_active)
values ('WC2026', 'FIFA World Cup', '2026', 'football-data', 'WC', true)
on conflict (code) do nothing;

-- matches.competition_id: nullable first so the backfill below can run, then
-- tightened to not null once every existing row has a value.
alter table public.matches add column if not exists competition_id uuid references public.competitions(id);

-- Knockout-ness set explicitly at sync time going forward, instead of being
-- inferred from `stage <> 'Group stage'` (see isKnockoutStage() in
-- src/lib/utils.ts, which incorrectly flags any non-group-stage match —
-- including an ordinary league match — as a knockout tie).
alter table public.matches add column if not exists is_knockout boolean not null default false;

update public.matches
set competition_id = (select id from public.competitions where code = 'WC2026'),
    is_knockout = (stage <> 'Group stage')
where competition_id is null;

alter table public.matches alter column competition_id set not null;

create index if not exists matches_competition_id_idx on public.matches(competition_id);

-- leagues.competition_id: null means "spans all competitions" (today's
-- behavior, preserved as the default). Set it to scope a private league to
-- one competition's fixtures only.
alter table public.leagues add column if not exists competition_id uuid references public.competitions(id);

-- matches_with_teams: add competition_id/is_knockout so consumers can filter
-- and PredictionForm can read is_knockout without a second query. New columns
-- are appended at the end of the select list — CREATE OR REPLACE VIEW can
-- only add trailing columns, not insert them mid-list (Postgres error 42P16
-- if you try, since that would reorder/rename existing output columns).
create or replace view public.matches_with_teams as
select
  m.id,
  m.stage,
  m.venue,
  m.kickoff_time,
  m.status,
  m.home_score,
  m.away_score,
  json_build_object(
    'id', ht.id,
    'name', ht.name,
    'country_code', ht.country_code,
    'group_name', ht.group_name,
    'emoji_flag', ht.emoji_flag
  ) as home_team,
  json_build_object(
    'id', at.id,
    'name', at.name,
    'country_code', at.country_code,
    'group_name', at.group_name,
    'emoji_flag', at.emoji_flag
  ) as away_team,
  m.competition_id,
  m.is_knockout
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id;

-- Leaderboard/league_leaderboard competition-scoping is deliberately NOT part
-- of this migration — that changes public.leaderboard from a view to a
-- function, which requires updating src/app/leaderboard/page.tsx in the same
-- deploy (PostgREST can't query a function via `.from()`). This migration
-- only lays the foundation (competitions + matches.competition_id); the
-- leaderboard-scoping migration ships alongside the competition-filter UI
-- (see docs/rollout/FOOTBALL_MVP.md, rollout stage 5).
