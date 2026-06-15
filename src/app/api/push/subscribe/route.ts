import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Stores the caller's browser PushSubscription so result notifications can reach
 * them. Authenticated: the row is written through the user's RLS-scoped client,
 * so a user can only ever subscribe themselves. Upserts on `endpoint` so the same
 * device re-subscribing (e.g. after a key rotation) refreshes rather than dupes.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh;
    const authKey = body.keys?.auth;
    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: auth.user.id,
        endpoint,
        p256dh,
        auth: authKey,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
