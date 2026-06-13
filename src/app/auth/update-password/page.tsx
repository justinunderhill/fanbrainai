'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

type Message = {
  type: 'success' | 'error';
  text: string;
};

type SessionStatus = 'checking' | 'ready' | 'invalid';

const INVALID_LINK_MESSAGE =
  'This reset link is invalid or has already been used. Email links are sometimes opened by spam/security scanners, which consumes the one-time link before you click. Request a fresh one below.';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<Message['type']>('error');

  function showMessage(nextMessage: Message) {
    setMessageType(nextMessage.type);
    setMessage(nextMessage.text);
  }

  // Establish the recovery session from whatever the recovery link delivered:
  //   - hash error params (`#error=...`): the one-time token was already
  //     consumed (often by an email link-scanner) or expired — surface why.
  //   - hash tokens (`#access_token=...&refresh_token=...`): the default
  //     verify-endpoint flow. We set the session explicitly via setSession
  //     rather than relying on detectSessionInUrl — the @supabase/ssr browser
  //     client defaults to the PKCE flow, whose URL detection only handles a
  //     `?code=` query and ignores these implicit-style hash tokens.
  //   - `?code=` query: PKCE links, exchanged via exchangeCodeForSession.
  // Only a valid session unlocks the form.
  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    function unlock() {
      if (settled) return;
      settled = true;
      setStatus('ready');
    }

    function fail(text: string) {
      if (settled) return;
      settled = true;
      setStatus('invalid');
      showMessage({ type: 'error', text });
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashError = hashParams.get('error_description') || hashParams.get('error');
    if (hashError) {
      fail(INVALID_LINK_MESSAGE);
      return;
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        unlock();
      }
    });

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const code = new URLSearchParams(window.location.search).get('code');

    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => (error ? fail(INVALID_LINK_MESSAGE) : unlock()));
    } else if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) fail(INVALID_LINK_MESSAGE);
        else unlock();
      });
    }

    // Fallback: a session may already be present (e.g. detectSessionInUrl, or a
    // logged-in user visiting directly to change their password).
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) unlock();
    });

    // Safety net: if nothing established a session, treat the link as expired.
    const timeout = setTimeout(() => fail(INVALID_LINK_MESSAGE), 5000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function updatePassword() {
    if (password.length < 6) {
      showMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      showMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        showMessage({ type: 'error', text: error.message });
        return;
      }

      showMessage({ type: 'success', text: 'Password updated. Taking you to matches...' });
      router.replace('/matches');
      router.refresh();
    } catch (error) {
      showMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not update password.',
      });
    } finally {
      setLoading(false);
    }
  }

  if (status === 'checking') {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-gray-400">Checking your reset link...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-black">Reset link problem</h1>
        <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {message ?? INVALID_LINK_MESSAGE}
        </p>
        <Link href="/auth" className="btn btn-primary mt-5 inline-flex px-5 py-3">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h1 className="text-3xl font-black">Set a new password</h1>
      <p className="mt-2 text-sm text-gray-400">Pick a new password to finish resetting your account.</p>

      <div className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-gray-300">New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-gray-300">Confirm new password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={updatePassword}
          className="btn btn-primary w-full px-5 py-3"
        >
          Update password
        </button>
        <PrivacyNote />
      </div>

      {message && (
        <p className={`mt-4 animate-slide-up rounded-2xl border px-4 py-3 text-sm ${
          messageType === 'error'
            ? 'border-red-400/30 bg-red-400/10 text-red-100'
            : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
        }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function PrivacyNote() {
  return (
    <div className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-200" />
      <p>
        Privacy note: we only use your details to run FanBrain AI, save your picks, and power the fun AI features.
        We won&apos;t sell your data or use it for unrelated personal purposes.
      </p>
    </div>
  );
}
