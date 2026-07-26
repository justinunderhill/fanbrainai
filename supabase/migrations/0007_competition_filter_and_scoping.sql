-- Competition filter UI + league scoping (rollout stage 5, docs/rollout/FOOTBALL_MVP.md).
-- WC2026 is over — archive it (is_active = false) so it drops out of the
-- default sync loop and the default /matches view, while staying fully
-- queryable for history (leaderboard, fan profiles, past-tournament view).
update public.competitions set is_active = false where code = 'WC2026';

-- Leagues can now be scoped to a single competition at creation time. Null
-- (the default) means "spans all competitions" — today's behavior, preserved.
-- Signature is additive (new param has a default), so existing callers that
-- only pass p_name keep working unchanged.
create or replace function public.create_league(p_name text, p_competition_id uuid default null)
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
  if p_competition_id is not null and not exists (select 1 from public.competitions where id = p_competition_id) then
    raise exception 'Unknown competition';
  end if;
  insert into public.leagues (name, owner_id, competition_id)
  values (trim(p_name), v_uid, p_competition_id)
  returning * into v_league;
  insert into public.league_members (league_id, user_id)
  values (v_league.id, v_uid);
  return v_league;
end;
$$;

-- Members-only leaderboard, now scoped to the league's competition_id when set
-- (join predictions through matches to filter); unscoped leagues (competition_id
-- is null) keep summing every prediction, same as before this migration.
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
declare
  v_competition_id uuid;
begin
  if not public.is_league_member(p_league) then
    raise exception 'Not a member of this league';
  end if;
  select competition_id into v_competition_id from public.leagues where id = p_league;
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
    and (v_competition_id is null or exists (
      select 1 from public.matches mt where mt.id = p.match_id and mt.competition_id = v_competition_id
    ))
  where m.league_id = p_league
  group by m.user_id, u.display_name, u.username
  order by total_points desc;
end;
$$;
