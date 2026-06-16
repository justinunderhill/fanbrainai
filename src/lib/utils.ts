import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MatchStatus } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All users (and the app owner) are in South Africa, so render kickoff times in
// SAST (UTC+2, no DST) regardless of where the code runs — the Vercel server is
// UTC, which previously made a 21:00 SAST kickoff show as "07:00 PM".
export function formatKickoff(input: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(input));
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

export function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return 'HOME';
  if (awayScore > homeScore) return 'AWAY';
  return 'DRAW';
}
