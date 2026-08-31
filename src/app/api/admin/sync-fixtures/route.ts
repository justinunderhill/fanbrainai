import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildUpserts, type MatchRow, type TeamRow } from '@/lib/fixtures/football-data';
import { scorePrediction, winnerSide } from '@/lib/scoring';
import { sendResultNotifications } from '@/lib/notifications/send-result-notifications';
import { sendPredictionReminders } from '@/lib/notifications/send-prediction-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Syncs fixtures + results for every active football-data.org competition,
 * then settles points for any newly-final matches. Idempotent — safe to run
 * on a schedule. One competition's fetch failing doesn't stop the others.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) or `x-cron-secret`.
 * One-time cleanup of the old placeholder seed data: append `?purgeSeed=1`.
 *
 * Handles GET and POST: Vercel Cron triggers endpoints with GET, while manual
 * runs use POST. Both require the secret, so exposing GET is safe.
 */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-cron-secret');
  const authorized = Boolean(secret) && (headerSecret === secret || bearer === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing FOOTBALL_DATA_API_TOKEN' }, { status: 500 });
  }

  const supabase = createAdminClient();
  const purgeSeed = new URL(request.url).searchParams.get('purgeSeed') === '1';

  const { data: activeCompetitions, error: competitionsErr } = await supabase
    .from('competitions')
    .select('id, provider_code, season, type')
    .eq('provider', 'football-data')
    .eq('is_active', true);
  if (competitionsErr) {
    return NextResponse.json({ error: `competitions lookup: ${competitionsErr.message}` }, { status: 500 });
  }

  // Fetch every active football-data competition independently — one
  // competition's provider hiccup (rate limit, transient 5xx) shouldn't stop
  // the rest of the sync.
  const teams: TeamRow[] = [];
  const matches: MatchRow[] = [];
  const competitionResults: Record<string, { teams: number; matches: number } | { error: string }> = {};
  for (const competition of activeCompetitions ?? []) {
    try {
      const result = await buildUpserts(token, {
        id: competition.id,
        providerCode: competition.provider_code,
        season: competition.season,
        type: competition.type === 'national' ? 'national' : 'club',
      });
      teams.push(...result.teams);
      matches.push(...result.matches);
      competitionResults[competition.provider_code] = { teams: result.teams.length, matches: result.matches.length };
    } catch (error) {
      competitionResults[competition.provider_code] = {
        error: error instanceof Error ? error.message : 'Fixture fetch failed',
      };
    }
  }

  // A club can belong to more than one active competition (for example,
  // Arsenal appears in both the Premier League and Champions League feeds).
  // PostgreSQL rejects a single ON CONFLICT statement when the same id occurs
  // more than once, so collapse provider rows by their stable team id before
  // sending the bulk upsert.
  const uniqueTeams = Array.from(new Map(teams.map((team) => [team.id, team])).values());

  // One-time removal of the placeholder seed data (and any test predictions on
  // those fake matches, via cascade). Real rows use different ids, so this never
  // touches imported data.
  let purgedMatches = 0;
  let purgedTeams = 0;
  if (purgeSeed) {
    const { count: mCount } = await supabase
      .from('matches')
      .delete({ count: 'exact' })
      .like('external_match_id', 'seed-%');
    // Seed team ids are 00000000-…-0000000000NN. LIKE doesn't work on a uuid
    // column via PostgREST, so match them with a uuid range instead.
    const { count: tCount } = await supabase
      .from('teams')
      .delete({ count: 'exact' })
      .gte('id', '00000000-0000-0000-0000-000000000001')
      .lte('id', '00000000-0000-0000-0000-0000000000ff');
    purgedMatches = mCount ?? 0;
    purgedTeams = tCount ?? 0;
  }

  const { error: teamErr } = await supabase.from('teams').upsert(uniqueTeams, { onConflict: 'id' });
  if (teamErr) {
    return NextResponse.json({ error: `teams upsert: ${teamErr.message}` }, { status: 500 });
  }

  // Results only ever move forward. Guard against a stale upstream read (or a
  // transient API blip) silently downgrading an already-final match back to
  // 'scheduled' and wiping its settled score — that's what made played matches
  // appear "un-played". Any incoming row that would demote a match we've already
  // marked final is dropped; the rest upsert normally.
  const { data: settled } = await supabase
    .from('matches')
    .select('external_match_id')
    .eq('status', 'final');
  const lockedFinal = new Set((settled ?? []).map((m: { external_match_id: string }) => m.external_match_id));
  const matchesToWrite = matches.filter(
    (m) => !(lockedFinal.has(m.external_match_id) && m.status !== 'final'),
  );
  const skippedDowngrades = matches.length - matchesToWrite.length;

  const { error: matchErr } = await supabase
    .from('matches')
    .upsert(matchesToWrite, { onConflict: 'external_match_id' });
  if (matchErr) {
    return NextResponse.json({ error: `matches upsert: ${matchErr.message}` }, { status: 500 });
  }

  // Settle points for matches that are now final with a known scoreline.
  const { data: finalMatches } = await supabase
    .from('matches')
    .select('id,home_score,away_score,winner_team_id,home_team_id,away_team_id')
    .eq('status', 'final')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);

  let scored = 0;
  for (const match of finalMatches ?? []) {
    const actualWinnerSide = winnerSide(match.winner_team_id, match.home_team_id, match.away_team_id);
    const { data: predictions } = await supabase.from('predictions').select('*').eq('match_id', match.id);
    for (const prediction of predictions ?? []) {
      const points = scorePrediction({
        predictedHomeScore: prediction.predicted_home_score,
        predictedAwayScore: prediction.predicted_away_score,
        actualHomeScore: match.home_score,
        actualAwayScore: match.away_score,
        actualWinnerSide,
        predictedWinnerSide: winnerSide(prediction.predicted_winner_team_id, match.home_team_id, match.away_team_id),
      });
      if (points !== prediction.points_awarded) {
        await supabase.from('predictions').update({ points_awarded: points }).eq('id', prediction.id);
        scored += 1;
      }
    }
  }

  // Notify users whose predicted matches just went final. Wrapped so a push
  // delivery problem can never fail the sync that already settled the points.
  let notifications = { usersNotified: 0, predictionsMarked: 0, deadSubscriptions: 0 };
  try {
    notifications = await sendResultNotifications(supabase);
  } catch (error) {
    console.error('sendResultNotifications failed', error);
  }

  // Nudge opted-in users about matches kicking off soon that they haven't
  // predicted. Wrapped so a reminder delivery problem can never fail the sync.
  let reminders = { usersNotified: 0, remindersMarked: 0, deadSubscriptions: 0 };
  try {
    reminders = await sendPredictionReminders(supabase);
  } catch (error) {
    console.error('sendPredictionReminders failed', error);
  }

  return NextResponse.json({
    competitions: competitionResults,
    teamsUpserted: uniqueTeams.length,
    matchesUpserted: matchesToWrite.length,
    skippedDowngrades,
    finalMatches: finalMatches?.length ?? 0,
    predictionsScored: scored,
    notifications,
    reminders,
    ...(purgeSeed ? { purgedSeedMatches: purgedMatches, purgedSeedTeams: purgedTeams } : {}),
  });
}
