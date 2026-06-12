import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return 'HOME';
  if (awayScore > homeScore) return 'AWAY';
  return 'DRAW';
}
