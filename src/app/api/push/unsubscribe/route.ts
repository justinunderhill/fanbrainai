import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Removes the caller's stored subscription for a given endpoint. RLS scopes the
 * delete to the current user's rows, so this can only ever drop the caller's own.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint } = (await request.json()) as { endpoint?: string };
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
