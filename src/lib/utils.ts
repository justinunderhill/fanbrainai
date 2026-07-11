import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MatchStatus, Team } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All users (and the app owner) are in South Africa, so render kickoff times in
// SAST (UTC+2, no DST) regardless of where the code runs — the Vercel server is
// UTC, which previously made a 21:00 SAST kickoff show as "07:00 PM".
const kickoffFormatter = new Intl.DateTimeFormat('en-ZA', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Johannesburg',
});

export function formatKickoff(input: string) {
  return kickoffFormatter.format(new Date(input));
}

// A scheduled match stays actionable until kickoff. Returns a short, human label for the
// card chip — a countdown for scheduled matches, otherwise the lifecycle state. Computed at
// render (server-side, UTC instant vs absolute kickoff), so it won't tick live, which matches
// the rest of the static card.
export function matchStateLabel(match: { status: MatchStatus; kickoff_time: string }): string {
  switch (match.status) {
    case 'live':
      return 'Live';
    case 'final':
      return 'Final';
    case 'postponed':
      return 'Postponed';
    default: {
      const ms = new Date(match.kickoff_time).getTime() - Date.now();
      if (ms <= 0) return 'Locked';
      const minutes = Math.round(ms / 60000);
      if (minutes < 2) return 'Locks soon';
      if (minutes < 60) return `Locks in ${minutes}m`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `Locks in ${hours}h`;
      return `Locks in ${Math.round(hours / 24)}d`;
    }
  }
}

// Fan personality types are phrased with their own article ("The Tactical Nerd"), so a
// sentence like "Jay is ${type}" needs none added — otherwise it reads "is a The Tactical
// Nerd". Only prepend "a/an" if a type somehow arrives without a leading article.
export function fanTypePhrase(type: string): string {
  const trimmed = type.trim();
  if (/^(the|a|an)\s/i.test(trimmed)) return trimmed;
  return `${/^[aeiou]/i.test(trimmed) ? 'an' : 'a'} ${trimmed}`;
}

// Knockout matches (Round of 32 onward) can be settled on penalties, so a level
// scoreline still has a winner. Stage is plain text seeded from football-data; the only
// group label is 'Group stage' (see STAGE_LABELS in lib/fixtures/football-data.ts), so
// anything else is a knockout tie.
export function isKnockoutStage(stage: string): boolean {
  return stage !== 'Group stage';
}

// Resolve a stored advance pick (predicted_winner_team_id) to one of the match's two
// teams for display, or null when there's no pick. Shared by every surface that shows a
// fan's "to advance on penalties" call.
export function advancingTeam(
  winnerTeamId: string | null,
  match: { home_team: Team; away_team: Team },
): Team | null {
  if (!winnerTeamId) return null;
  if (match.home_team.id === winnerTeamId) return match.home_team;
  if (match.away_team.id === winnerTeamId) return match.away_team;
  return null;
}

export function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return 'HOME';
  if (awayScore > homeScore) return 'AWAY';
  return 'DRAW';
}
