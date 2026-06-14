'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'fb-install-dismissed';
const DISMISS_DAYS = 30;

function dismissedRecently() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(ts) && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
}

/**
 * Tasteful install nudge. On Android/desktop Chrome it captures the
 * `beforeinstallprompt` event and offers a one-tap install; on iOS Safari (which
 * has no install API) it shows the manual "Share → Add to Home Screen" hint.
 * Hidden once installed or recently dismissed (30-day snooze).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS never fires beforeinstallprompt — surface the manual hint instead.
    if (isIos()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowIosHint(true);
    }

    const onInstalled = () => {
      setDeferred(null);
      setShowIosHint(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable — fall back to hiding for this session only.
    }
    setDeferred(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // Whatever the choice, the event can only be used once.
    setDeferred(null);
  }

  if (!deferred && !showIosHint) return null;

  return (
    <div className="bottom-safe fixed inset-x-3 z-50 mx-auto max-w-md animate-slide-up rounded-3xl border border-emerald-300/25 bg-gray-950/95 p-4 shadow-glow backdrop-blur sm:inset-x-auto sm:right-4">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-emerald-400 p-2 text-gray-950">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Install FanBrain</p>
          {deferred ? (
            <p className="mt-1 text-sm text-gray-300">Add the app to your device for a full-screen, app-like experience.</p>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-gray-300">
              Tap <Share size={15} className="inline text-sky-300" /> then
              <span className="inline-flex items-center gap-1 font-bold text-white">
                <SquarePlus size={15} /> Add to Home Screen
              </span>
            </p>
          )}
          {deferred && (
            <button onClick={install} className="btn btn-primary mt-3 px-4 py-2 text-sm">
              <Download size={15} /> Install
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss install prompt" className="btn btn-ghost h-8 w-8 shrink-0 p-0">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
