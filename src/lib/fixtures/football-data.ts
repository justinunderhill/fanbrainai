/**
 * football-data.org adapter. Fetches teams + matches for a given competition
 * (identified by the provider's own competition code, e.g. `WC`, `PL`, `CL`)
 * and season, and normalizes them into rows for our `teams` and `matches`
 * tables. Re-running is idempotent: teams use a deterministic UUID (v5)
 * derived from the football-data id, and matches upsert by
 * `external_match_id` — so the same job both seeds fixtures and syncs
 * results as scores come in.
 *
 * Server-only. Never import into client components (uses the API token).
 */
import { createHash } from 'node:crypto';

const API_BASE = 'https://api.football-data.org/v4';

// Fixed namespace so team ids are stable across runs/machines.
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/** Deterministic UUID v5 (SHA-1 based) so the same input always maps to the same id. */
function uuidv5(name: string): string {
  const ns = Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex');
  const bytes = createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function teamUuid(footballDataTeamId: number): string {
  return uuidv5(`football-data:team:${footballDataTeamId}`);
}

/** football-data `area.code` -> flag emoji, for all 48 qualified nations (+ neutral fallback). */
const FLAG_BY_AREA_CODE: Record<string, string> = {
  ALG: '🇩🇿', ARG: '🇦🇷', AUS: '🇦🇺', AUT: '🇦🇹', BEL: '🇧🇪', BIH: '🇧🇦', BRA: '🇧🇷',
  CAN: '🇨🇦', CPV: '🇨🇻', COL: '🇨🇴', COD: '🇨🇩', HRV: '🇭🇷', CUW: '🇨🇼', CZE: '🇨🇿',
  ECU: '🇪🇨', EGY: '🇪🇬', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', FRA: '🇫🇷', DEU: '🇩🇪', GHA: '🇬🇭', HTI: '🇭🇹',
  IRN: '🇮🇷', IRQ: '🇮🇶', CIV: '🇨🇮', JPN: '🇯🇵', JOR: '🇯🇴', MEX: '🇲🇽', MAR: '🇲🇦',
  NLD: '🇳🇱', NZL: '🇳🇿', NOR: '🇳🇴', PAN: '🇵🇦', PRY: '🇵🇾', POR: '🇵🇹', QAT: '🇶🇦',
  KSA: '🇸🇦', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', SEN: '🇸🇳', RSA: '🇿🇦', KOR: '🇰🇷', ESP: '🇪🇸', SWE: '🇸🇪',
  CHE: '🇨🇭', TUN: '🇹🇳', TUR: '🇹🇷', USA: '🇺🇸', URY: '🇺🇾', UZB: '🇺🇿',
};

function flagFor(areaCode: string | undefined): string {
  return (areaCode && FLAG_BY_AREA_CODE[areaCode]) || '🏳️';
}

/** football-data `stage` -> our human-readable `matches.stage` text. */
const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-final',
  SEMI_FINALS: 'Semi-final',
  THIRD_PLACE: 'Third-place playoff',
  FINAL: 'Final',
};

// Explicit allowlist of football-data stage codes that are knockout ties (a
// level scoreline needs a penalty-shootout winner). Anything not listed here
// — GROUP_STAGE, a league's REGULAR_SEASON, or any other unmapped code —
// is NOT a knockout tie, so an ordinary league draw is never misidentified
// as one. Deliberately the inverse of the old isKnockoutStage() heuristic
// (src/lib/utils.ts), which treated everything except the literal string
// 'Group stage' as a knockout.
const KNOCKOUT_STAGE_CODES = new Set([
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
]);

type MatchStatus = 'scheduled' | 'live' | 'final' | 'postponed';

/** football-data `status` -> our `match_status` enum. */
function mapStatus(status: string): MatchStatus {
  switch (status) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'FINISHED':
    case 'AWARDED':
      return 'final';
    case 'POSTPONED':
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'postponed';
    default:
      return 'scheduled'; // SCHEDULED, TIMED
  }
}

type RawTeam = { id: number; name: string; tla: string | null; crest?: string | null; area?: { code?: string } };
type RawMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  venue?: string | null;
  matchday?: number | null;
  homeTeam: { id: number | null };
  awayTeam: { id: number | null };
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
};

export type TeamRow = {
  id: string;
  name: string;
  country_code: string;
  group_name: string | null;
  emoji_flag: string;
  crest_url: string | null;
};

export type MatchRow = {
  external_match_id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_time: string;
  venue: string | null;
  stage: string;
  is_knockout: boolean;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
};

/** One row from the `competitions` table, as much as this adapter needs. */
export type CompetitionRef = {
  id: string;
  /** football-data's own competition code, e.g. 'WC', 'PL', 'CL'. */
  providerCode: string;
  season: string;
};

async function fetchJson(path: string, token: string) {
  // `no-store`: each sync must see live standings. Without it Next.js can cache
  // the upstream response and feed a stale snapshot into the sync, which then
  // reverts freshly-finished matches back to 'scheduled' (see the downgrade guard
  // in the sync route). Results must always reflect the current API state.
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'X-Auth-Token': token }, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data ${path} -> HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Fetch + normalize one competition/season into upsert-ready team and match rows. */
export async function buildUpserts(token: string, competition: CompetitionRef): Promise<{ teams: TeamRow[]; matches: MatchRow[] }> {
  const [teamsData, matchesData] = await Promise.all([
    fetchJson(`/competitions/${competition.providerCode}/teams?season=${competition.season}`, token),
    fetchJson(`/competitions/${competition.providerCode}/matches?season=${competition.season}`, token),
  ]);

  const rawTeams: RawTeam[] = teamsData.teams ?? [];
  const rawMatches: RawMatch[] = matchesData.matches ?? [];

  // Derive each team's group letter from its group-stage matches.
  const groupByTeamId = new Map<number, string>();
  for (const m of rawMatches) {
    if (m.stage === 'GROUP_STAGE' && m.group && m.homeTeam.id && m.awayTeam.id) {
      const letter = m.group.replace('GROUP_', '');
      groupByTeamId.set(m.homeTeam.id, letter);
      groupByTeamId.set(m.awayTeam.id, letter);
    }
  }

  const teams: TeamRow[] = rawTeams.map((t) => ({
    id: teamUuid(t.id),
    name: t.name,
    country_code: t.tla ?? t.area?.code ?? '',
    group_name: groupByTeamId.get(t.id) ?? null,
    emoji_flag: flagFor(t.area?.code),
    crest_url: t.crest ?? null,
  }));

  const matches: MatchRow[] = [];
  for (const m of rawMatches) {
    // Skip fixtures whose teams aren't decided yet (knockouts before the groups
    // resolve) — our schema requires both team FKs. They get imported on a later
    // run once the bracket fills in.
    if (!m.homeTeam.id || !m.awayTeam.id) continue;

    const status = mapStatus(m.status);
    const home = m.score.fullTime.home;
    const away = m.score.fullTime.away;
    let winnerId: string | null = null;
    if (m.score.winner === 'HOME_TEAM') winnerId = teamUuid(m.homeTeam.id);
    else if (m.score.winner === 'AWAY_TEAM') winnerId = teamUuid(m.awayTeam.id);

    matches.push({
      external_match_id: `fd-${m.id}`,
      competition_id: competition.id,
      home_team_id: teamUuid(m.homeTeam.id),
      away_team_id: teamUuid(m.awayTeam.id),
      kickoff_time: m.utcDate,
      venue: m.venue ?? null,
      stage: STAGE_LABELS[m.stage] ?? m.stage,
      is_knockout: KNOCKOUT_STAGE_CODES.has(m.stage),
      status,
      home_score: status === 'final' || status === 'live' ? home : null,
      away_score: status === 'final' || status === 'live' ? away : null,
      winner_team_id: status === 'final' ? winnerId : null,
    });
  }

  return { teams, matches };
}
