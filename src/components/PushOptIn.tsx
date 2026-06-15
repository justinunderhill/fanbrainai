'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';

const DISMISS_KEY = 'fb-push-optin-dismissed';

/** VAPID public keys are base64url; PushManager wants the raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  // Back with an explicit ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which is what PushManager.subscribe's applicationServerKey expects.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

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
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
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

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error('subscribe failed');

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
