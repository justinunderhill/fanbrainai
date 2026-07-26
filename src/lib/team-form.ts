/**
 * Recent-form lookup for a single team, built entirely from completed matches we
 * already store (synced from football-data.org). No extra API calls — it reads
 * the same `matches`/`teams` tables the rest of the app does, so it works for
 * anyone (matches + teams are public-readable) and stays fresh with the sync job.
 *
 * Results are normalized to the chosen team's perspective (their goals first,
 * win/draw/loss from their side) so the prediction page can show "how this side
 * has actually been playing" next to the score steppers.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Team } from '@/lib/types';

export type FormResult = 'W' | 'D' | 'L';

export type TeamFormMatch = {
  matchId: string;
  kickoff_time: string;
  stage: string;
  result: FormResult;
  teamScore: number;
  opponentScore: number;
  opponent: Pick<Team, 'name' | 'country_code' | 'emoji_flag' | 'crest_url' | 'is_national_team'>;
};

export type TeamForm = {
  matches: TeamFormMatch[]; // oldest -> newest, capped at `limit`
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

// Shape of the embedded opponent rows PostgREST returns for the two team FKs.
type EmbeddedTeam = {
  name: string;
  country_code: string;
  emoji_flag: string | null;
  crest_url: string | null;
  is_national_team: boolean;
};
type RawFormRow = {
  id: string;
  kickoff_time: string;
  stage: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: string;
  away_team_id: string;
  home: EmbeddedTeam | EmbeddedTeam[] | null;
  away: EmbeddedTeam | EmbeddedTeam[] | null;
};

// PostgREST may type a to-one embed as an array; normalize to the single row.
function one(value: EmbeddedTeam | EmbeddedTeam[] | null): EmbeddedTeam | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Fetch a team's most recent finished matches (default 5), newest-first from the
 * DB, returned oldest-first so form pills read left-to-right chronologically.
 */
export async function getTeamForm(
  supabase: SupabaseClient,
  teamId: string,
  limit = 5,
): Promise<TeamForm> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, kickoff_time, stage, home_score, away_score, home_team_id, away_team_id, ' +
        'home:home_team_id(name, country_code, emoji_flag, crest_url, is_national_team), ' +
        'away:away_team_id(name, country_code, emoji_flag, crest_url, is_national_team)',
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'final')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .order('kickoff_time', { ascending: false })
    .limit(limit);

  const empty: TeamForm = { matches: [], wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  if (error || !data) return empty;

  const rows = (data as unknown as RawFormRow[])
    .map((row): TeamFormMatch | null => {
      const isHome = row.home_team_id === teamId;
      const teamScore = isHome ? row.home_score : row.away_score;
      const opponentScore = isHome ? row.away_score : row.home_score;
      const opponentRaw = one(isHome ? row.away : row.home);
      if (teamScore == null || opponentScore == null || !opponentRaw) return null;

      const result: FormResult = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
      return {
        matchId: row.id,
        kickoff_time: row.kickoff_time,
        stage: row.stage,
        result,
        teamScore,
        opponentScore,
        opponent: {
          name: opponentRaw.name,
          country_code: opponentRaw.country_code,
          emoji_flag: opponentRaw.emoji_flag,
          crest_url: opponentRaw.crest_url,
          is_national_team: opponentRaw.is_national_team,
        },
      };
    })
    .filter((row): row is TeamFormMatch => row !== null)
    // DB gave newest-first; flip to chronological for display.
    .reverse();

  return rows.reduce<TeamForm>(
    (acc, m) => {
      if (m.result === 'W') acc.wins += 1;
      else if (m.result === 'D') acc.draws += 1;
      else acc.losses += 1;
      acc.goalsFor += m.teamScore;
      acc.goalsAgainst += m.opponentScore;
      return acc;
    },
    { ...empty, matches: rows },
  );
}
