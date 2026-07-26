-- Bug: TeamBadge picked flag-vs-crest by matching team.country_code against a
-- table of national-team ISO codes. football-data.org reuses the same 3-letter
-- shape for club abbreviations, and some collide with real ISO codes — e.g.
-- Chelsea FC's TLA is 'CHE', which is also Switzerland's ISO code, so Chelsea
-- rendered the Swiss flag instead of its crest. That heuristic can't be patched
-- reliably (more collisions are inevitable as PSL and future competitions add
-- more 3-letter club codes) — same class of bug as isKnockoutStage() (0004),
-- fixed the same way: replace inference with an explicit flag set at sync time.
--
-- A given football-data team id is only ever a national team OR a club (WC2026
-- entrants never reappear as PL/CL/PSL clubs), so this is safe to set once from
-- which competition type synced the team, no per-team guessing required.

alter table public.competitions add column if not exists type text not null default 'club' check (type in ('club', 'national'));
update public.competitions set type = 'national' where code = 'WC2026';

alter table public.teams add column if not exists is_national_team boolean not null default false;
update public.teams t set is_national_team = true
where exists (
  select 1 from public.matches m
  join public.competitions c on c.id = m.competition_id
  where c.code = 'WC2026' and (m.home_team_id = t.id or m.away_team_id = t.id)
);

-- matches_with_teams: surface is_national_team on both team objects, same
-- append-only pattern as 0006's crest_url addition.
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
    'emoji_flag', ht.emoji_flag,
    'crest_url', ht.crest_url,
    'is_national_team', ht.is_national_team
  ) as home_team,
  json_build_object(
    'id', at.id,
    'name', at.name,
    'country_code', at.country_code,
    'group_name', at.group_name,
    'emoji_flag', at.emoji_flag,
    'crest_url', at.crest_url,
    'is_national_team', at.is_national_team
  ) as away_team,
  m.competition_id,
  m.is_knockout
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id;
