'use client';

import { useEffect, useState } from 'react';
import { useSerwist } from '@serwist/turbopack/react';
import { RefreshCw } from 'lucide-react';

/**
 * "Update available" toast. With skipWaiting disabled (see sw.ts), a freshly
 * deployed service worker installs and waits; we surface a prompt and only
 * activate + reload when the user opts in, so the swap never disrupts an active
 * session. No-op in dev / unsupported browsers (serwist is null there).
 */
export function UpdateToast() {
  const { serwist } = useSerwist();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setWaiting(true);
    serwist.addEventListener('waiting', onWaiting);
    return () => serwist.removeEventListener('waiting', onWaiting);
  }, [serwist]);

  function refresh() {
    if (!serwist) return;
    // Reload once the new worker takes control, then tell it to skip waiting.
    serwist.addEventListener('controlling', () => window.location.reload());
    serwist.messageSkipWaiting();
    setWaiting(false);
  }

  if (!waiting) return null;

  return (
    <div className="bottom-safe fixed inset-x-3 z-50 mx-auto flex max-w-md animate-slide-up items-center gap-3 rounded-3xl border border-sky-300/25 bg-gray-950/95 p-4 shadow-glow backdrop-blur sm:inset-x-auto sm:right-4">
      <span className="rounded-2xl bg-sky-400 p-2 text-gray-950">
        <RefreshCw size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">New version available</p>
        <p className="mt-1 text-sm text-gray-300">Refresh to get the latest FanBrain.</p>
      </div>
      <button onClick={refresh} className="btn btn-primary shrink-0 px-4 py-2 text-sm">
        Refresh
      </button>
    </div>
  );
}
