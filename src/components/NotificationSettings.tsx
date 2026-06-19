'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check, Loader2, Send, Share, Smartphone } from 'lucide-react';
import { pushSupported, syncPushSubscription, VAPID_PUBLIC_KEY } from '@/lib/push';

type Env = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isIOS: boolean;
  isStandalone: boolean;
};

function readEnv(): Env {
  const supported = pushSupported() && Boolean(VAPID_PUBLIC_KEY);
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  // iPadOS 13+ reports as desktop Safari, so also treat touch-capable "Macs" as iOS.
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  const isStandalone =
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true);
  return { supported, permission, isIOS, isStandalone };
}

/** Notification controls: enable alerts, send a test push to verify delivery on
 *  this device, or (on un-installed iOS) prompt to add the app to the home screen
 *  — the only way iOS exposes the Push API. */
export function NotificationSettings() {
  const [env, setEnv] = useState<Env | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Notification/navigator APIs are client-only, so read them after mount to
    // avoid a hydration mismatch (same pattern as PushOptIn).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(readEnv());
  }, []);

  if (!env) return null;

  async function enable() {
    setBusy(true);
    setStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('Notifications were not allowed. You can enable them in your browser settings.');
        return;
      }
      const saved = await syncPushSubscription();
      setStatus(saved ? 'Notifications are on. Send a test below to check this device.' : 'Could not finish enabling notifications. Please try again.');
      setEnv(readEnv());
    } catch {
      setStatus('Could not enable notifications. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setStatus(null);
    try {
      // Make sure this device's subscription is saved before asking the server to send.
      await syncPushSubscription();
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = (await res.json()) as { sent?: number; message?: string; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? 'Could not send a test notification.');
      } else if ((data.sent ?? 0) > 0) {
        setStatus('Test sent — it should appear on this device within a few seconds.');
      } else {
        setStatus(data.message ?? 'No subscription was reachable on this device.');
      }
    } catch {
      setStatus('Could not send a test notification. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const wrap = 'rounded-3xl border border-white/10 bg-white/[0.03] p-5';

  // iOS Safari only exposes the Push API inside the installed PWA.
  if (env.isIOS && !env.isStandalone && !env.supported) {
    return (
      <section className={wrap}>
        <p className="flex items-center gap-2 text-sm font-black text-sky-200"><Smartphone size={16} /> Notifications on iPhone/iPad</p>
        <p className="mt-2 text-sm text-gray-300">
          To get result alerts on iOS, add FanBrain to your home screen first: tap the <Share size={14} className="inline align-text-bottom" /> Share button in Safari, then <span className="font-bold text-white">Add to Home Screen</span>. Open the app from there and you&apos;ll be able to turn alerts on.
        </p>
      </section>
    );
  }

  if (!env.supported) {
    return (
      <section className={wrap}>
        <p className="flex items-center gap-2 text-sm font-black text-gray-300"><BellOff size={16} /> Notifications</p>
        <p className="mt-2 text-sm text-gray-400">This browser doesn&apos;t support web push notifications.</p>
      </section>
    );
  }

  return (
    <section className={wrap}>
      <p className="flex items-center gap-2 text-sm font-black text-sky-200"><Bell size={16} /> Result notifications</p>
      <p className="mt-1 text-sm text-gray-400">A ping when your predicted matches finish, plus a nudge before kickoffs you haven&apos;t called.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {env.permission === 'granted' ? (
          <button onClick={sendTest} disabled={busy} className="btn btn-primary px-5 py-3">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {busy ? 'Sending...' : 'Send test notification'}
          </button>
        ) : env.permission === 'denied' ? (
          <p className="text-sm text-amber-200">Notifications are blocked for this site. Re-enable them in your browser settings, then reload.</p>
        ) : (
          <button onClick={enable} disabled={busy} className="btn btn-primary px-5 py-3">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            {busy ? 'Enabling...' : 'Enable notifications'}
          </button>
        )}
      </div>

      {status && (
        <p className="mt-3 flex items-start gap-2 text-sm text-gray-300">
          <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /> {status}
        </p>
      )}
    </section>
  );
}
