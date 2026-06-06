import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/config';

// Refreshes the Supabase auth token on every request and writes the rotated
// cookies onto the response. Required by @supabase/ssr so that Server
// Components and route handlers read a fresh session.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANT: do not run logic between createServerClient and getUser().
  // getUser() revalidates the token and triggers the cookie refresh above.
  await supabase.auth.getUser();

  return response;
}
