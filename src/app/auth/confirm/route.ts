import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Email auth callback (magic link + signup confirmation).
 *
 * Uses the server-side `token_hash` + verifyOtp flow recommended for
 * @supabase/ssr — it works across devices/browsers (no PKCE verifier needed)
 * and establishes the session in cookies here on the server. Falls back to the
 * `code` (PKCE/OAuth) exchange if that's what arrives.
 *
 * Requires the Supabase email templates to point here, e.g.:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/matches';

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    return NextResponse.redirect(new URL('/auth?error=link_expired', requestUrl.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    return NextResponse.redirect(new URL('/auth?error=link_expired', requestUrl.origin));
  }

  return NextResponse.redirect(new URL('/auth?error=invalid_link', requestUrl.origin));
}
