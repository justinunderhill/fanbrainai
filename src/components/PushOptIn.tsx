'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { pushSupported, syncPushSubscription, VAPID_PUBLIC_KEY } from '@/lib/push';

const DISMISS_KEY = 'fb-push-optin-dismissed';

/**
 * Value-framed nudge to turn on result notifications, shown once after a user
 * saves a prediction. Only appears when web push is actually usable (SW + Push API,
 * permission still un-asked, VAPID key present) and the user hasn't dismissed or
 * granted before — tracked in localStorage so it never nags. On iOS this only
 * surfaces inside the installed PWA, where the Push API exists (16.4+).
 */
export function PushOptIn({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!pushSupported() || !VAPID_PUBLIC_KEY) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      return;
    }
    // 'granted' → already on (or asked elsewhere); 'denied' → can't re-prompt.
    if (Notification.permission !== 'default') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [active]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage unavailable — hide for this session only.
    }
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismiss();
        return;
      }

      const saved = await syncPushSubscription();
      if (!saved) throw new Error('subscribe failed');

      dismiss();
    } catch {
      setError('Could not turn on notifications. You can try again later.');
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="bottom-safe fixed inset-x-3 z-50 mx-auto max-w-md animate-slide-up rounded-3xl border border-sky-300/25 bg-gray-950/95 p-4 shadow-glow backdrop-blur sm:inset-x-auto sm:right-4">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-sky-400 p-2 text-gray-950">
          <Bell size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Get a ping when your result is in</p>
          <p className="mt-1 text-sm text-gray-300">
            We&apos;ll notify you only about matches you predicted — your score and points, nothing else.
          </p>
          {error && <p className="mt-2 text-sm text-amber-300">{error}</p>}
          <button onClick={enable} disabled={busy} className="btn btn-primary mt-3 px-4 py-2 text-sm">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
            {busy ? 'Turning on...' : 'Notify me'}
          </button>
        </div>
        <button onClick={dismiss} aria-label="Dismiss notification prompt" className="btn btn-ghost h-8 w-8 shrink-0 p-0">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
