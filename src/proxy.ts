import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  // The app renders a setup notice when Supabase is not configured; don't
  // attempt a session refresh (it would throw on missing env).
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - common static asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
