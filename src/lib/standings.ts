import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchWithTeams, Team } from '@/lib/types';

export type StandingsRow = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

/**
 * League table ("log") for one competition, derived from matches we already
 * store — no extra provider call. Every team that has a fixture in the
 * competition appears (0-played rows included, e.g. before a season kicks
 * off), sorted by points then goal difference then goals scored, the standard
 * football tiebreak order. Doesn't model provider-level point deductions —
 * fine for "who's currently top", not an official records source.
 */
export async function getStandings(supabase: SupabaseClient, competitionId: string): Promise<StandingsRow[]> {
  const { data } = await supabase
    .from('matches_with_teams')
    .select('*')
    .eq('competition_id', competitionId);
  return computeStandings((data ?? []) as MatchWithTeams[]);
}

/** Pure table computation, split out so callers who already have matches for
 * several competitions in hand (e.g. one bulk fetch) can avoid a per-competition
 * round-trip — see getTopOfTheLog in src/app/page.tsx. */
export function computeStandings(matches: MatchWithTeams[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>();
  function row(team: Team): StandingsRow {
    let r = table.get(team.id);
    if (!r) {
      r = { team, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0 };
      table.set(team.id, r);
    }
    return r;
  }

  for (const m of matches) {
    const home = row(m.home_team);
    const away = row(m.away_team);
    if (m.status !== 'final' || m.home_score == null || m.away_score == null) continue;

    home.played += 1;
    away.played += 1;
    home.goals_for += m.home_score;
    home.goals_against += m.away_score;
    away.goals_for += m.away_score;
    away.goals_against += m.home_score;

    if (m.home_score > m.away_score) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.away_score > m.home_score) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = [...table.values()];
  for (const r of rows) r.goal_diff = r.goals_for - r.goals_against;

  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goal_diff - a.goal_diff ||
      b.goals_for - a.goals_for ||
      a.team.name.localeCompare(b.team.name),
  );
}
