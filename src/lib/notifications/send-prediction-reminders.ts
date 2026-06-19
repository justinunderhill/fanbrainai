import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/site-url';

/** How far ahead of kickoff we nudge users who haven't predicted yet. */
const REMINDER_WINDOW_HOURS = 6;

type UpcomingMatchRow = {
  id: string;
  kickoff_time: string;
  home_team: { name: string; emoji_flag: string | null };
  away_team: { name: string; emoji_flag: string | null };
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type Summary = { usersNotified: number; remindersMarked: number; deadSubscriptions: number };

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

/**
 * Sends one batched "get your picks in" push per opted-in user who still hasn't
 * predicted a match kicking off within the next REMINDER_WINDOW_HOURS. Records
 * each (user, match) nudge in `prediction_reminders` so re-runs of the 30-min
 * sync never re-ping for the same match. Only users with a live push
 * subscription are eligible. Never throws — delivery problems are swallowed so a
 * notification failure can't break the result sync that calls this.
 */
export async function sendPredictionReminders(supabase: SupabaseClient): Promise<Summary> {
  const summary: Summary = { usersNotified: 0, remindersMarked: 0, deadSubscriptions: 0 };

  if (!ensureVapid()) return summary;

  // Scheduled matches kicking off inside the reminder window (future-only).
  const now = Date.now();
  const windowEnd = new Date(now + REMINDER_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data: upcoming } = await supabase
    .from('matches_with_teams')
    .select('id, kickoff_time, home_team, away_team')
    .eq('status', 'scheduled')
    .gt('kickoff_time', new Date(now).toISOString())
    .lte('kickoff_time', windowEnd)
    .order('kickoff_time', { ascending: true })
    .returns<UpcomingMatchRow[]>();

  if (!upcoming?.length) return summary;

  const matchById = new Map(upcoming.map((m) => [m.id, m]));
  const windowMatchIds = Array.from(matchById.keys());

  // Eligible users = those with at least one push subscription. No point nudging
  // someone who can't receive a push.
  const { data: subRows } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .returns<{ user_id: string }[]>();

  const eligibleUserIds = Array.from(new Set((subRows ?? []).map((r) => r.user_id)));
  if (!eligibleUserIds.length) return summary;

  // Predictions and prior reminders already covering these window matches, so we
  // only nudge about matches a user has neither predicted nor been reminded of.
  const { data: predictedRows } = await supabase
    .from('predictions')
    .select('user_id, match_id')
    .in('user_id', eligibleUserIds)
    .in('match_id', windowMatchIds)
    .returns<{ user_id: string; match_id: string }[]>();

  const { data: remindedRows } = await supabase
    .from('prediction_reminders')
    .select('user_id, match_id')
    .in('user_id', eligibleUserIds)
    .in('match_id', windowMatchIds)
    .returns<{ user_id: string; match_id: string }[]>();

  const coveredByUser = new Map<string, Set<string>>();
  for (const row of [...(predictedRows ?? []), ...(remindedRows ?? [])]) {
    const set = coveredByUser.get(row.user_id) ?? new Set<string>();
    set.add(row.match_id);
    coveredByUser.set(row.user_id, set);
  }

  const markedReminders: { user_id: string; match_id: string }[] = [];

  for (const userId of eligibleUserIds) {
    const covered = coveredByUser.get(userId) ?? new Set<string>();
    const missing = windowMatchIds.filter((id) => !covered.has(id));
    if (!missing.length) continue;

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .returns<SubscriptionRow[]>();

    // Subscriptions may have been pruned since the eligibility scan above. Mark
    // the reminders anyway so we don't accrue a backlog that fires on re-subscribe.
    if (!subscriptions?.length) {
      markedReminders.push(...missing.map((matchId) => ({ user_id: userId, match_id: matchId })));
      continue;
    }

    const { title, body, url } = buildMessage(missing, matchById);
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
    // Mark regardless of per-endpoint failures: re-nudging on the next 30-min run
    // would be more annoying than dropping a single reminder.
    markedReminders.push(...missing.map((matchId) => ({ user_id: userId, match_id: matchId })));
  }

  if (markedReminders.length) {
    // ignoreDuplicates so a race with a concurrent run can't error on the pkey.
    await supabase
      .from('prediction_reminders')
      .upsert(markedReminders, { onConflict: 'user_id,match_id', ignoreDuplicates: true });
    summary.remindersMarked = markedReminders.length;
  }

  return summary;
}

function buildMessage(
  missingMatchIds: string[],
  matchById: Map<string, UpcomingMatchRow>,
): { title: string; body: string; url: string } {
  if (missingMatchIds.length === 1) {
    const match = matchById.get(missingMatchIds[0])!;
    const flag = match.home_team.emoji_flag ? `${match.home_team.emoji_flag} ` : '';
    return {
      title: '⏰ Kickoff coming up',
      body: `${flag}${match.home_team.name} vs ${match.away_team.name} kicks off soon — get your pick in before it locks.`,
      url: `${SITE_URL}/matches/${missingMatchIds[0]}`,
    };
  }

  return {
    title: '⏰ Matches kicking off soon',
    body: `${missingMatchIds.length} matches kick off in the next few hours and you haven't called them yet. Lock in your picks!`,
    url: `${SITE_URL}/matches`,
  };
}
