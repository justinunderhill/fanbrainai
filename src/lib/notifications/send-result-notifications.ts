import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/site-url';

type FinalMatchRow = {
  id: string;
  home_score: number;
  away_score: number;
  home_team: { name: string; emoji_flag: string | null };
  away_team: { name: string; emoji_flag: string | null };
};

type PredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  points_awarded: number;
  share_token: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type Summary = { usersNotified: number; predictionsMarked: number; deadSubscriptions: number };

let vapidConfigured = false;

/** Lazily wire VAPID details from env; returns false if keys are missing. */
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@fanbrainai.com';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function pointsPhrase(points: number): string {
  if (points >= 5) return 'you nailed the exact score, +5 pts!';
  if (points >= 3) return 'you called the result, +3 pts!';
  return 'no points this time — better luck next match.';
}

/**
 * Sends one personal "your result is in" push per user for predictions that just
 * went final, then marks them so reruns never re-notify. Batches multiple settled
 * picks from the same sync run into a single digest. Safe to call repeatedly: the
 * `result_notified_at` guard makes it idempotent. Never throws — delivery problems
 * are swallowed so a notification failure can't break the result sync.
 */
export async function sendResultNotifications(supabase: SupabaseClient): Promise<Summary> {
  const summary: Summary = { usersNotified: 0, predictionsMarked: 0, deadSubscriptions: 0 };

  if (!ensureVapid()) return summary;

  // Final matches with a known scoreline, with team names for the message body.
  const { data: finalMatches } = await supabase
    .from('matches_with_teams')
    .select('id, home_score, away_score, home_team, away_team')
    .eq('status', 'final')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .returns<FinalMatchRow[]>();

  if (!finalMatches?.length) return summary;

  const matchById = new Map(finalMatches.map((m) => [m.id, m]));

  // Settled predictions on those matches that haven't been notified yet.
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, user_id, match_id, points_awarded, share_token')
    .is('result_notified_at', null)
    .in('match_id', Array.from(matchById.keys()))
    .returns<PredictionRow[]>();

  if (!predictions?.length) return summary;

  // Group unnotified predictions by user for one digest each.
  const byUser = new Map<string, PredictionRow[]>();
  for (const prediction of predictions) {
    const list = byUser.get(prediction.user_id) ?? [];
    list.push(prediction);
    byUser.set(prediction.user_id, list);
  }

  const notifiedPredictionIds: string[] = [];

  for (const [userId, userPredictions] of byUser) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .returns<SubscriptionRow[]>();

    // Even with no live subscription, mark these as notified so we never accrue
    // a stale backlog that fires the moment the user later subscribes.
    if (!subscriptions?.length) {
      notifiedPredictionIds.push(...userPredictions.map((p) => p.id));
      continue;
    }

    const { title, body, url } = buildMessage(userPredictions, matchById);
    const payload = JSON.stringify({ title, body, url });

    let deliveredToAny = false;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
        );
        deliveredToAny = true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // 404/410 mean the subscription is gone for good — prune it.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
          summary.deadSubscriptions += 1;
        }
        // Other errors (network, transient 5xx) are left for the next sync run.
      }
    }

    if (deliveredToAny) summary.usersNotified += 1;
    // Mark regardless of per-endpoint failures: with batched 30-min digests,
    // re-sending the same settled results later would be worse than dropping one.
    notifiedPredictionIds.push(...userPredictions.map((p) => p.id));
  }

  if (notifiedPredictionIds.length) {
    await supabase
      .from('predictions')
      .update({ result_notified_at: new Date().toISOString() })
      .in('id', notifiedPredictionIds);
    summary.predictionsMarked = notifiedPredictionIds.length;
  }

  return summary;
}

function buildMessage(
  predictions: PredictionRow[],
  matchById: Map<string, FinalMatchRow>,
): { title: string; body: string; url: string } {
  if (predictions.length === 1) {
    const prediction = predictions[0];
    const match = matchById.get(prediction.match_id)!;
    const flag = match.home_team.emoji_flag ? `${match.home_team.emoji_flag} ` : '';
    return {
      title: 'Your result is in ⚽',
      body: `${flag}${match.home_team.name} ${match.home_score}–${match.away_score} ${match.away_team.name} — ${pointsPhrase(prediction.points_awarded)}`,
      url: `${SITE_URL}/r/${prediction.share_token}`,
    };
  }

  const totalPoints = predictions.reduce((sum, p) => sum + p.points_awarded, 0);
  return {
    title: 'Your results are in ⚽',
    body: `${predictions.length} of your matches just scored, +${totalPoints} pts total. Tap to see how you did.`,
    url: `${SITE_URL}/predictions`,
  };
}
