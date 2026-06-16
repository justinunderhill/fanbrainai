import type { MatchWithTeams, Prediction } from '@/lib/types';

export type NextActionKind = 'signed-out' | 'no-picks' | 'under-5-picks' | 'pending-results' | 'all-settled';

export type NextAction = {
  kind: NextActionKind;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  label: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  progress?: {
    value: number;
    max: number;
    label: string;
  };
};

type PredictionLite = Pick<Prediction, 'match_id'>;

export function nextPredictableMatch(
  matches: MatchWithTeams[],
  predictedMatchIds: Iterable<string> = [],
  now = Date.now(),
): MatchWithTeams | null {
  const predicted = new Set(predictedMatchIds);

  return [...matches]
    .filter((match) => (
      match.status === 'scheduled' &&
      new Date(match.kickoff_time).getTime() > now &&
      !predicted.has(match.id)
    ))
    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())[0] ?? null;
}

export function buildNextAction({
  signedIn,
  matches,
  predictions,
  hasProfile = false,
  now = Date.now(),
}: {
  signedIn: boolean;
  matches: MatchWithTeams[];
  predictions: PredictionLite[];
  hasProfile?: boolean;
  now?: number;
}): NextAction {
  const predictedIds = predictions.map((prediction) => prediction.match_id);
  const nextMatch = nextPredictableMatch(matches, predictedIds, now);
  const nextMatchHref = nextMatch ? `/matches/${nextMatch.id}` : '/matches';
  const nextMatchTitle = nextMatch
    ? `${nextMatch.home_team.name} vs ${nextMatch.away_team.name}`
    : 'the next match';

  if (!signedIn) {
    return {
      kind: 'signed-out',
      eyebrow: 'Next move',
      title: 'Save your calls and build a fan profile',
      body: 'Sign in to keep predictions, unlock AI verdicts, and climb the leaderboard.',
      href: '/auth',
      label: 'Sign in',
      secondaryHref: '/matches',
      secondaryLabel: 'Browse matches',
    };
  }

  if (predictions.length === 0) {
    return {
      kind: 'no-picks',
      eyebrow: 'Start here',
      title: nextMatch ? `Predict ${nextMatchTitle}` : 'Make your first prediction',
      body: nextMatch
        ? 'Your first saved pick starts the verdict, roast, and profile loop.'
        : 'No open matches are ready right now. Check the match list for the full schedule.',
      href: nextMatchHref,
      label: nextMatch ? 'Predict this match' : 'View matches',
    };
  }

  if (!hasProfile && predictions.length < 5) {
    const remaining = 5 - predictions.length;
    return {
      kind: 'under-5-picks',
      eyebrow: 'Profile progress',
      title: `${remaining} more ${remaining === 1 ? 'pick' : 'picks'} to unlock your fan profile`,
      body: nextMatch
        ? `Make another call, starting with ${nextMatchTitle}.`
        : 'You are close. Your profile unlocks once more fixtures open and you reach five picks.',
      href: nextMatchHref,
      label: nextMatch ? 'Make next pick' : 'View matches',
      secondaryHref: '/profile',
      secondaryLabel: 'View profile',
      progress: {
        value: predictions.length,
        max: 5,
        label: `${predictions.length}/5 predictions`,
      },
    };
  }

  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const pendingCount = predictions.filter((prediction) => {
    const match = matchesById.get(prediction.match_id);
    return match && match.status !== 'final';
  }).length;

  if (pendingCount > 0) {
    return {
      kind: 'pending-results',
      eyebrow: 'Results pending',
      title: `${pendingCount} ${pendingCount === 1 ? 'pick is' : 'picks are'} waiting on a result`,
      body: nextMatch
        ? 'Track your locked calls or keep the streak moving with another match.'
        : 'Come back after the final whistle for points and an AI debrief.',
      href: '/predictions',
      label: 'Track my picks',
      secondaryHref: nextMatch ? nextMatchHref : undefined,
      secondaryLabel: nextMatch ? 'Predict next match' : undefined,
    };
  }

  return {
    kind: 'all-settled',
    eyebrow: 'Next call',
    title: nextMatch ? `Predict ${nextMatchTitle}` : 'You are caught up',
    body: nextMatch
      ? 'All settled picks are banked. Make the next call before it locks.'
      : 'No open matches are waiting right now. Check back when the schedule moves.',
    href: nextMatchHref,
    label: nextMatch ? 'Predict next match' : 'View matches',
    secondaryHref: '/predictions',
    secondaryLabel: 'Review picks',
  };
}
