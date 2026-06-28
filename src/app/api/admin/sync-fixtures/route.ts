import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildWorldCupUpserts } from '@/lib/fixtures/football-data';
import { scorePrediction, winnerSide } from '@/lib/scoring';
import { sendResultNotifications } from '@/lib/notifications/send-result-notifications';
import { sendPredictionReminders } from '@/lib/notifications/send-prediction-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Syncs WC 2026 fixtures + results from football-data.org, then settles points
 * for any newly-final matches. Idempotent — safe to run on a schedule.
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

  let teams;
  let matches;
  try {
    ({ teams, matches } = await buildWorldCupUpserts(token));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fixture fetch failed' },
      { status: 502 },
    );
  }

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

  const { error: teamErr } = await supabase.from('teams').upsert(teams, { onConflict: 'id' });
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
  const lockedFinal = new Set((settled ?? []).map((m) => m.external_match_id as string));
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
    teamsUpserted: teams.length,
    matchesUpserted: matchesToWrite.length,
    skippedDowngrades,
    finalMatches: finalMatches?.length ?? 0,
    predictionsScored: scored,
    notifications,
    reminders,
    ...(purgeSeed ? { purgedSeedMatches: purgedMatches, purgedSeedTeams: purgedTeams } : {}),
  });
}
