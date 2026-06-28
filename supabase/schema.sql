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
  -- Team the fan calls to advance on penalties for a level knockout pick (null otherwise).
  -- Mirrors matches.winner_team_id so the same scoring helper grades both sides.
  predicted_winner_team_id uuid references public.teams(id),
  prediction_style public.prediction_style not null,
  user_reason text,
  locked_at timestamptz,
  points_awarded int not null default 0,
  ai_verdict text,
  ai_roast text,
  ai_debrief text,
  -- Unguessable, unlisted share handle for the public /r/[token] page. Read
  -- server-side via the service-role admin client; no anon grant is added.
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create unique index predictions_share_token_key on public.predictions(share_token);

create table public.fan_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  personality_type text not null,
  logic_score int not null check (logic_score between 0 and 100),
  chaos_score int not null check (chaos_score between 0 and 100),
  loyalty_score int not null check (loyalty_score between 0 and 100),
  risk_score int not null check (risk_score between 0 and 100),
  summary text not null,
  -- Unguessable, unlisted share handle. Read server-side via the service-role
  -- admin client (see /p/[token]); no anon grant is added to this table.
  share_token uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

create unique index fan_profiles_share_token_key on public.fan_profiles(share_token);

-- Web push subscriptions for personal result notifications. One row per browser
-- endpoint; a user can have several (multiple devices/browsers). See
-- src/app/api/push/* and src/lib/notifications/send-result-notifications.ts.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

-- Idempotency guard: set once a result push covering this settled pick has been
-- sent, so re-runs of the 30-min sync never re-notify. Null until notified.
alter table public.predictions add column if not exists result_notified_at timestamptz;

-- Idempotency log for deadline reminders: one row per (user, match) once we've
-- nudged that user about an unpredicted match kicking off soon, so the 30-min
-- sync never double-pings them for the same match. Like push_subscriptions, this
-- is touched only by the service-role admin client (RLS-exempt) — no grants/policies.
-- See src/lib/notifications/send-prediction-reminders.ts.
create table if not exists public.prediction_reminders (
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, match_id)
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
  -- Outcome-only hits (correct result, wrong scoreline). Exact scores are a
  -- separate bucket above, so this filters on exactly 3 to avoid double-counting.
  count(*) filter (where p.points_awarded = 3)::int as correct_outcomes,
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
before insert or update of predicted_home_score, predicted_away_score, predicted_outcome, predicted_winner_team_id, prediction_style, user_reason
on public.predictions
for each row execute function public.prevent_late_prediction();

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.fan_profiles enable row level security;
alter table public.push_subscriptions enable row level security;
-- No policies/grants: only the service-role admin client (RLS-exempt) reads/writes this.
alter table public.prediction_reminders enable row level security;

create policy "Public can read teams" on public.teams for select using (true);
create policy "Public can read matches" on public.matches for select using (true);
create policy "Users can read own profile row" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile row" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can read own predictions" on public.predictions for select using (auth.uid() = user_id);
create policy "Users can create own predictions" on public.predictions for insert with check (auth.uid() = user_id);
create policy "Users can update own predictions" on public.predictions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own fan profile" on public.fan_profiles for select using (auth.uid() = user_id);
-- Users manage only their own push subscriptions. Sends run via the service-role
-- admin client (RLS-exempt), so no select/update policy is needed for delivery.
create policy "Users can read own push subscriptions" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can create own push subscriptions" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own push subscriptions" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own push subscriptions" on public.push_subscriptions for delete using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

revoke all on public.users from anon, authenticated;
revoke all on public.teams from anon, authenticated;
revoke all on public.matches from anon, authenticated;
revoke all on public.predictions from anon, authenticated;
revoke all on public.fan_profiles from anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;

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
  predicted_winner_team_id,
  prediction_style,
  user_reason
) on public.predictions to authenticated;
grant update (
  predicted_home_score,
  predicted_away_score,
  predicted_outcome,
  predicted_winner_team_id,
  prediction_style,
  user_reason,
  ai_verdict,
  ai_roast
) on public.predictions to authenticated;

grant select on public.fan_profiles to authenticated;

grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, last_used_at) on public.push_subscriptions to authenticated;
-- endpoint is included because the subscribe route upserts on conflict (endpoint),
-- and Postgres checks UPDATE privileges on every column in the DO UPDATE SET list
-- (even on a first insert that never hits the conflict path).
grant update (user_id, endpoint, p256dh, auth, last_used_at) on public.push_subscriptions to authenticated;

-- Leaderboard is intentionally public; it exposes display names and aggregate scores only.
grant select on public.matches_with_teams to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

-- ============================================================================
-- Private leagues: friends form a group and compete on a members-only board.
-- Predictions are RLS-restricted to their own user, so the members-scoped
-- leaderboard and the join-before-you're-a-member lookups run through
-- SECURITY DEFINER functions (same pattern as handle_new_user) rather than
-- broad table grants.
-- ============================================================================

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  owner_id uuid not null references public.users(id) on delete cascade,
  -- Short, unguessable, URL-safe handle shared as /leagues/join/<code>.
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists league_members_user_id_idx on public.league_members(user_id);

-- Membership check used inside RLS policies. SECURITY DEFINER so it bypasses RLS
-- on league_members and avoids the policy recursing into itself.
create or replace function public.is_league_member(p_league uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league and user_id = auth.uid()
  );
$$;

-- Create a league and add the caller as its first member, atomically. Routed
-- through a definer so a league can never exist without its owner as a member.
create or replace function public.create_league(p_name text)
returns public.leagues
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_league public.leagues;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'League name is required';
  end if;
  insert into public.leagues (name, owner_id)
  values (trim(p_name), v_uid)
  returning * into v_league;
  insert into public.league_members (league_id, user_id)
  values (v_league.id, v_uid);
  return v_league;
end;
$$;

-- Join a league by invite code. Definer so a non-member can insert their own
-- membership row (there is intentionally no direct insert grant/policy).
create or replace function public.join_league(p_invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_league_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_league_id from public.leagues where invite_code = p_invite_code;
  if v_league_id is null then
    raise exception 'League not found';
  end if;
  insert into public.league_members (league_id, user_id)
  values (v_league_id, v_uid)
  on conflict (league_id, user_id) do nothing;
  return v_league_id;
end;
$$;

-- Public-by-code preview so the join page can show the league name to someone
-- who isn't a member yet, without exposing a broad select on leagues.
create or replace function public.league_by_invite(p_invite_code text)
returns table (id uuid, name text, member_count bigint)
language sql
security definer set search_path = public
as $$
  select l.id, l.name, count(lm.user_id) as member_count
  from public.leagues l
  left join public.league_members lm on lm.league_id = l.id
  where l.invite_code = p_invite_code
  group by l.id, l.name;
$$;

-- Members-only leaderboard, mirroring the public `leaderboard` view but scoped
-- to one league's members. Guarded so only members can read it. Members with no
-- settled predictions still appear (left join) so the roster is always complete.
create or replace function public.league_leaderboard(p_league uuid)
returns table (
  user_id uuid,
  display_name text,
  total_points int,
  exact_scores int,
  correct_outcomes int,
  total_predictions int
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_league_member(p_league) then
    raise exception 'Not a member of this league';
  end if;
  return query
  select
    m.user_id,
    coalesce(u.display_name, u.username, 'Anonymous fan') as display_name,
    coalesce(sum(p.points_awarded), 0)::int as total_points,
    count(p.id) filter (where p.points_awarded = 5)::int as exact_scores,
    count(p.id) filter (where p.points_awarded = 3)::int as correct_outcomes,
    count(p.id)::int as total_predictions
  from public.league_members m
  join public.users u on u.id = m.user_id
  left join public.predictions p on p.user_id = m.user_id
  where m.league_id = p_league
  group by m.user_id, u.display_name, u.username
  order by total_points desc;
end;
$$;

-- Hand a league to another member, then the old owner becomes a regular member
-- (free to leave). Definer + checks: only the current owner can transfer, and
-- only to someone who is already a member. Avoids a permissive UPDATE policy
-- whose WITH CHECK on owner_id would block legitimate transfers.
create or replace function public.transfer_league_ownership(p_league uuid, p_new_owner uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from public.leagues where id = p_league and owner_id = v_uid) then
    raise exception 'Only the league owner can transfer ownership';
  end if;
  if not exists (select 1 from public.league_members where league_id = p_league and user_id = p_new_owner) then
    raise exception 'New owner must be a member of the league';
  end if;
  update public.leagues set owner_id = p_new_owner where id = p_league;
end;
$$;

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

create policy "Members can read their leagues" on public.leagues
  for select using (public.is_league_member(id));
create policy "Owners can delete their leagues" on public.leagues
  for delete using (owner_id = auth.uid());
-- Creation is intentionally only via create_league() (definer) so the owner is
-- always enrolled as a member; there is no direct insert policy.

create policy "Members can read co-members" on public.league_members
  for select using (public.is_league_member(league_id));
create policy "Members can leave a league" on public.league_members
  for delete using (user_id = auth.uid());
-- Joining is only via join_league()/create_league() (definer); no insert policy.

revoke all on public.leagues from anon, authenticated;
revoke all on public.league_members from anon, authenticated;
grant select, delete on public.leagues to authenticated;
grant select, delete on public.league_members to authenticated;

grant execute on function public.is_league_member(uuid) to authenticated;
grant execute on function public.create_league(text) to authenticated;
grant execute on function public.join_league(text) to authenticated;
grant execute on function public.league_by_invite(text) to authenticated;
grant execute on function public.league_leaderboard(uuid) to authenticated;
grant execute on function public.transfer_league_ownership(uuid, uuid) to authenticated;
