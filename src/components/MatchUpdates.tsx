'use client';

import { useEffect, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 60_000;

/** Re-fetch server-rendered results while viewing match-related pages. */
export function MatchUpdates() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const resultsPage = pathname === '/' || pathname === '/table' || pathname === '/predictions' ||
      pathname === '/leaderboard' || pathname === '/matches' || pathname.startsWith('/matches/');
    if (!resultsPage) return;

    let lastRefresh = 0;
    function refresh() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      // Keep prediction entry uninterrupted while someone is editing a field.
      if (document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const now = Date.now();
      if (now - lastRefresh < REFRESH_INTERVAL) return;
      lastRefresh = now;
      router.refresh();
    }

    // Also refresh restored/cached routes and a phone app returning to the foreground.
    refresh();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [pathname, router]);

  return null;
}

export function RefreshResults() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="btn btn-ghost px-4 py-2 text-sm"
      aria-label="Refresh match results"
    >
      <RefreshCw size={16} className={pending ? 'animate-spin' : undefined} />
      {pending ? 'Refreshing…' : 'Refresh results'}
    </button>
  );
}
