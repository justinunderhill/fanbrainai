import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/site-url';

export const runtime = 'nodejs';

/**
 * Sends a test push to the caller's own stored subscriptions so they can verify
 * delivery on this device on demand (rather than waiting for a real result).
 * Uses the user's RLS-scoped client: it can only read and prune the caller's own
 * subscriptions. Returns how many endpoints accepted the push.
 */
export async function POST() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@fanbrainai.com';
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'Push is not configured on the server.' }, { status: 500 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', auth.user.id);

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, dead: 0, message: 'No push subscription saved for this account on this device.' });
  }

  const payload = JSON.stringify({
    title: '✅ FanBrain test alert',
    body: 'If you can read this, push notifications are working on this device.',
    url: `${SITE_URL}/profile`,
  });

  let sent = 0;
  let dead = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
        dead += 1;
      }
    }
  }

  return NextResponse.json({ sent, dead });
}
