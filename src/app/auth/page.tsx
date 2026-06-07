'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

type AuthMode = 'magic' | 'password';
type Message = {
  type: 'success' | 'error';
  text: string;
};

function getRedirectTarget() {
  const fallback = '/matches';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  // Only honor an explicit, same-origin `next` (e.g. the "Sign in to predict"
  // CTA returning you to a match). Otherwise land on the Matches hub — no
  // referrer-based guessing, which used to dump users on a random match page.
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;

  return fallback;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkError] = useState(() => {
    if (typeof window === 'undefined') return null;
    const error = new URLSearchParams(window.location.search).get('error');
    if (error === 'link_expired') return 'That sign-in link has expired. Enter your email to get a new one.';
    if (error === 'invalid_link') return 'That sign-in link was invalid. Please try signing in again.';
    return null;
  });
  const [message, setMessage] = useState<string | null>(linkError);
  const [messageType, setMessageType] = useState<Message['type']>(linkError ? 'error' : 'success');

  function showMessage(nextMessage: Message) {
    setMessageType(nextMessage.type);
    setMessage(nextMessage.text);
  }

  async function sendMagicLink() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const redirectTarget = getRedirectTarget();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectTarget)}`,
        },
      });
      showMessage(error
        ? { type: 'error', text: error.message }
        : { type: 'success', text: 'Check your email for the sign-in link.' });
    } catch (error) {
      showMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not start sign-in.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPassword() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showMessage({ type: 'error', text: error.message });
        return;
      }

      showMessage({ type: 'success', text: 'Signed in. Taking you to matches...' });
      router.replace(getRedirectTarget());
      router.refresh();
    } catch (error) {
      showMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not sign in.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithPassword() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const redirectTarget = getRedirectTarget();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || undefined },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectTarget)}`,
        },
      });

      if (error) {
        showMessage({ type: 'error', text: error.message });
        return;
      }

      if (data.session) {
        showMessage({ type: 'success', text: 'Account created. Taking you to matches...' });
        router.replace(redirectTarget);
        router.refresh();
      } else {
        showMessage({ type: 'success', text: 'Account created. Please sign in.' });
      }
    } catch (error) {
      showMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not create account.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h1 className="text-3xl font-black">Sign in</h1>
      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-gray-950 p-1">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`chip rounded-xl px-3 py-2 text-sm font-bold ${mode === 'password' ? 'bg-emerald-400 text-gray-950 shadow-glow-strong' : 'text-gray-300 hover:text-white'}`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`chip rounded-xl px-3 py-2 text-sm font-bold ${mode === 'magic' ? 'bg-emerald-400 text-gray-950 shadow-glow-strong' : 'text-gray-300 hover:text-white'}`}
        >
          Magic link
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-gray-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
          />
        </label>

        {mode === 'password' ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-gray-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="current-password"
                className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-gray-300">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional for sign-up"
                autoComplete="nickname"
                className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={signInWithPassword}
                className="btn btn-primary px-5 py-3"
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={signUpWithPassword}
                className="btn btn-ghost px-5 py-3"
              >
                Sign up
              </button>
            </div>
            <PrivacyNote />
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={sendMagicLink}
              className="btn btn-primary w-full px-5 py-3"
            >
              Send magic link
            </button>
            <PrivacyNote />
          </>
        )}
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
