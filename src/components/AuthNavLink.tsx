'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/browser';

type AuthNavLinkProps = {
  /** Extra classes, e.g. `w-full` to stretch inside the mobile menu. */
  className?: string;
  /** Called after a sign-in tap or sign-out so the parent can close the mobile menu. */
  onNavigate?: () => void;
};

export function AuthNavLink({ className = '', onNavigate }: AuthNavLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const href = pathname && pathname !== '/auth'
    ? `/auth?next=${encodeURIComponent(pathname)}`
    : '/auth';

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setSigningOut(false);
    onNavigate?.();
    // Send the user back to the home screen after signing out, rather than
    // leaving them stranded on a now-unauthenticated page (e.g. /profile).
    router.push('/');
    router.refresh();
  }

  if (loading) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-gray-400 ${className}`}>
        Checking...
      </span>
    );
  }

  if (user) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className={`btn btn-ghost px-4 py-2 text-sm ${className}`}
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} className={`btn btn-primary px-4 py-2 text-sm ${className}`}>
      Sign in
    </Link>
  );
}
