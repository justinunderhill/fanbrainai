import { CompetitionFilter } from '@/components/CompetitionFilter';
import { MatchesBrowser } from '@/components/MatchesBrowser';
import { NextActionCard } from '@/components/NextActionCard';
import { SetupNotice } from '@/components/SetupNotice';
import { buildNextAction } from '@/lib/next-action';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Competition, MatchWithTeams, Prediction } from '@/lib/types';

type View = 'upcoming' | 'completed';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; view?: string }>;
}) {
  const { competition: selectedCode, view: viewParam } = await searchParams;
  const supabaseConfigured = hasSupabasePublicEnv();
  let shownMatches: MatchWithTeams[] = [];
  let upcomingCount = 0;
  let completedCount = 0;
  let predictedMatchIds = new Set<string>();
  let signedIn = false;
  let competitions: Competition[] = [];
  let view: View = viewParam === 'completed' ? 'completed' : 'upcoming';
  let nextActionMatches: MatchWithTeams[] = [];
  let liveCompetitionIds = new Set<string>();

  if (supabaseConfigured) {
    const supabase = await createClient();
    const [competitionsResult, authResult] = await Promise.all([
      supabase.from('competitions').select('id, code, name, season, is_active').order('name'),
      supabase.auth.getUser(),
    ]);
    competitions = (competitionsResult.data ?? []) as Competition[];

    // Default to active competitions only, so a finished tournament doesn't
    // clutter the main view — an explicit ?competition= code (including an
    // archived one) always wins.
    const selected = selectedCode ? competitions.find((c) => c.code === selectedCode) : undefined;
    const competitionIds = selected
      ? [selected.id]
      : competitions.filter((c) => c.is_active).map((c) => c.id);

    const { data: { user } } = authResult;
    signedIn = Boolean(user);

    // "Not final" covers scheduled/live/postponed — the set both the Upcoming
    // tab and the next-action logic need, and only a fraction of a full season's
    // rows. Always fetched (cheap, and needed either way); the completed-count
    // is a head-only count so the tab badge is accurate without shipping rows.
    const [notFinalResult, completedCountResult, liveResult, predictionsResult] = await Promise.all([
      supabase
        .from('matches_with_teams')
        .select('*')
        .in('competition_id', competitionIds)
        .neq('status', 'final')
        .order('kickoff_time', { ascending: true }),
      supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .in('competition_id', competitionIds)
        .eq('status', 'final'),
      // Independent of the competition filter above — the tab row needs to know
      // which *other* competitions are live right now too, not just the selected one.
      supabase.from('matches').select('competition_id').eq('status', 'live'),
      user ? supabase.from('predictions').select('match_id').eq('user_id', user.id) : Promise.resolve({ data: null }),
    ]);
    liveCompetitionIds = new Set((liveResult.data ?? []).map((m) => m.competition_id as string));

    const notFinalMatches = (notFinalResult.data ?? []) as MatchWithTeams[];
    // Live first, then soonest kickoff.
    notFinalMatches.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    });

    upcomingCount = notFinalMatches.length;
    completedCount = completedCountResult.count ?? 0;
    nextActionMatches = notFinalMatches;
    predictedMatchIds = new Set((predictionsResult.data ?? []).map((p) => p.match_id as string));

    // No explicit ?view= and nothing upcoming: land on Completed instead of an
    // empty Upcoming tab (mirrors the previous client-side fallback).
    if (!viewParam && upcomingCount === 0 && completedCount > 0) view = 'completed';

    if (view === 'completed') {
      const { data: finalData } = await supabase
        .from('matches_with_teams')
        .select('*')
        .in('competition_id', competitionIds)
        .eq('status', 'final')
        .order('kickoff_time', { ascending: false });
      shownMatches = (finalData ?? []) as MatchWithTeams[];
    } else {
      shownMatches = notFinalMatches;
    }
  }

  const nextAction = supabaseConfigured
    ? buildNextAction({
        signedIn,
        // Deliberately the not-final set regardless of which tab is shown — it's
        // everything buildNextAction needs (next open match, pending-result count;
        // a predicted match not in this set is implicitly final, i.e. not pending).
        matches: nextActionMatches,
        predictions: [...predictedMatchIds].map((match_id) => ({ match_id })) as Pick<Prediction, 'match_id'>[],
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Matches</h1>
        <p className="mt-2 text-gray-400">Open a match, predict the score, then let FanBrain AI judge the pick.</p>
      </div>
      {!supabaseConfigured && <SetupNotice />}
      {competitions.length > 0 && (
        <CompetitionFilter
          competitions={competitions}
          selectedCode={selectedCode ?? null}
          liveCompetitionIds={liveCompetitionIds}
        />
      )}
      {nextAction && <NextActionCard action={nextAction} />}
      {supabaseConfigured && (
        <MatchesBrowser
          matches={shownMatches}
          predictedMatchIds={[...predictedMatchIds]}
          view={view}
          upcomingCount={upcomingCount}
          completedCount={completedCount}
          competitionCode={selectedCode ?? null}
        />
      )}
    </div>
  );
}
