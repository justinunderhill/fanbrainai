-- The global leaderboard used to sum every prediction ever made, so a retired
-- tournament's points stayed baked into "the" leaderboard forever — the same
-- clutter problem WC2026 caused on /matches, now fixed the same way: default
-- to active competitions only, keep archived ones reachable by explicit choice.
-- (Reverses this project's earlier "global leaderboard unchanged" decision in
-- docs/rollout/FOOTBALL_MVP.md — see that doc's updated acceptance criteria.)
--
-- The view can't take a parameter, so this replaces it with a function:
-- p_competition_id = null -> sum only predictions on active-competition matches
-- (today's default view); a specific id -> that one competition only, active
-- or archived (so a WC2026 fan can still pull up the World Cup board).
drop view if exists public.leaderboard;

create or replace function public.leaderboard(p_competition_id uuid default null)
returns table (
  user_id uuid,
  display_name text,
  total_points int,
  exact_scores int,
  correct_outcomes int,
  total_predictions int
)
language sql
stable
security definer set search_path = public
as $$
  select
    p.user_id,
    coalesce(u.display_name, u.username, 'Anonymous fan') as display_name,
    coalesce(sum(p.points_awarded), 0)::int as total_points,
    count(*) filter (where p.points_awarded = 5)::int as exact_scores,
    count(*) filter (where p.points_awarded = 3)::int as correct_outcomes,
    count(*)::int as total_predictions
  from public.predictions p
  join public.matches m on m.id = p.match_id
  join public.competitions c on c.id = m.competition_id
  left join public.users u on u.id = p.user_id
  where (p_competition_id is null and c.is_active) or c.id = p_competition_id
  group by p.user_id, u.display_name, u.username;
$$;

grant execute on function public.leaderboard(uuid) to anon, authenticated;
