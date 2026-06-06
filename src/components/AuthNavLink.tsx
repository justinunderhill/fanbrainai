'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/browser';

export function AuthNavLink() {
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
    router.refresh();
  }

  if (loading) {
    return <span className="rounded-full border border-white/10 px-4 py-2 text-gray-400">Checking...</span>;
  }

  if (user) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="btn btn-ghost px-4 py-2 text-sm"
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    );
  }

  return (
    <Link href={href} className="btn btn-primary px-4 py-2 text-sm">
      Sign in
    </Link>
  );
}
