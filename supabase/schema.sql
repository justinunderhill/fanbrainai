-- FanBrain AI schema
-- Apply this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create type public.match_status as enum ('scheduled', 'live', 'final', 'postponed');
create type public.prediction_outcome as enum ('HOME', 'DRAW', 'AWAY');
create type public.prediction_style as enum ('head', 'heart', 'chaos', 'underdog', 'tactical', 'vibes');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null,
  group_name text,
  emoji_flag text,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_match_id text unique,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  kickoff_time timestamptz not null,
  venue text,
  stage text not null default 'Group stage',
  status public.match_status not null default 'scheduled',
  home_score int,
  away_score int,
  winner_team_id uuid references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_teams check (home_team_id <> away_team_id),
  constraint scores_non_negative check ((home_score is null or home_score >= 0) and (away_score is null or away_score >= 0))
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score int not null check (predicted_home_score >= 0 and predicted_home_score <= 15),
  predicted_away_score int not null check (predicted_away_score >= 0 and predicted_away_score <= 15),
  predicted_outcome public.prediction_outcome not null,
  prediction_style public.prediction_style not null,
  user_reason text,
  locked_at timestamptz,
  points_awarded int not null default 0,
  ai_verdict text,
  ai_roast text,
  ai_debrief text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create table public.fan_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  personality_type text not null,
  logic_score int not null check (logic_score between 0 and 100),
  chaos_score int not null check (chaos_score between 0 and 100),
  loyalty_score int not null check (loyalty_score between 0 and 100),
  risk_score int not null check (risk_score between 0 and 100),
  summary text not null,
  updated_at timestamptz not null default now()
);

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
  ) as away_team
from public.matches m
join public.teams ht on ht.id = m.home_team_id
join public.teams at on at.id = m.away_team_id;

create or replace view public.leaderboard as
select
  p.user_id,
  coalesce(u.display_name, u.username, 'Anonymous fan') as display_name,
  coalesce(sum(p.points_awarded), 0)::int as total_points,
  count(*) filter (where p.points_awarded = 5)::int as exact_scores,
  count(*) filter (where p.points_awarded >= 3)::int as correct_outcomes,
  count(*)::int as total_predictions
from public.predictions p
left join public.users u on u.id = p.user_id
group by p.user_id, u.display_name, u.username;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '-' || left(new.id::text, 8)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_late_prediction()
returns trigger
language plpgsql
as $$
declare kickoff timestamptz;
begin
  select kickoff_time into kickoff from public.matches where id = new.match_id;
  if kickoff <= now() then
    raise exception 'Predictions are locked for this match.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_late_prediction_trigger on public.predictions;
create trigger prevent_late_prediction_trigger
before insert or update of predicted_home_score, predicted_away_score, predicted_outcome, prediction_style, user_reason
on public.predictions
for each row execute function public.prevent_late_prediction();

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.fan_profiles enable row level security;

create policy "Public can read teams" on public.teams for select using (true);
create policy "Public can read matches" on public.matches for select using (true);
create policy "Users can read own profile row" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile row" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can read own predictions" on public.predictions for select using (auth.uid() = user_id);
create policy "Users can create own predictions" on public.predictions for insert with check (auth.uid() = user_id);
create policy "Users can update own predictions" on public.predictions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own fan profile" on public.fan_profiles for select using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

revoke all on public.users from anon, authenticated;
revoke all on public.teams from anon, authenticated;
revoke all on public.matches from anon, authenticated;
revoke all on public.predictions from anon, authenticated;
revoke all on public.fan_profiles from anon, authenticated;

grant select on public.teams to anon, authenticated;
grant select on public.matches to anon, authenticated;

grant select on public.users to authenticated;
grant update (display_name, username, avatar_url) on public.users to authenticated;

grant select on public.predictions to authenticated;
grant insert (
  user_id,
  match_id,
  predicted_home_score,
  predicted_away_score,
  predicted_outcome,
  prediction_style,
  user_reason
) on public.predictions to authenticated;
grant update (
  predicted_home_score,
  predicted_away_score,
  predicted_outcome,
  prediction_style,
  user_reason,
  ai_verdict,
  ai_roast
) on public.predictions to authenticated;

grant select on public.fan_profiles to authenticated;

-- Leaderboard is intentionally public; it exposes display names and aggregate scores only.
grant select on public.matches_with_teams to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
