-- Club crest images. National teams already render fine via TeamBadge's
-- flag-by-country-code lookup, but club teams (Premier League, Champions
-- League) had no equivalent — country_code for a club holds football-data's
-- team abbreviation (e.g. 'MUN'), not an actual country, so it never matched
-- the flag lookup and fell back to plain text. crest_url is football-data's
-- own club badge image, populated by the sync (see
-- src/lib/fixtures/football-data.ts).

alter table public.teams add column if not exists crest_url text;

-- matches_with_teams: surface crest_url on both team objects. This only
-- changes the contents of the existing home_team/away_team jsonb columns,
-- not the view's top-level column list/order, so it's safe under
-- CREATE OR REPLACE VIEW (unlike inserting a new top-level column midway
-- through the list, which 0004 hit and had to work around).
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
    'crest_url', ht.crest_url
  ) as home_team,
  json_build_object(
    'id', at.id,
    'name', at.name,
    'country_code', at.country_code,
    'group_name', at.group_name,
    'emoji_flag', at.emoji_flag,
    'crest_url', at.crest_url
  ) as away_team,
  m.competition_id,
  m.is_knockout
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id;
