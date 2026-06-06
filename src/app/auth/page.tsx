'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

  if (next?.startsWith('/')) return next;

  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin && referrer.pathname !== '/auth') {
        return `${referrer.pathname}${referrer.search}`;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<Message['type']>('success');

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
      router.push(getRedirectTarget());
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
        router.push(redirectTarget);
        router.refresh();
      } else {
        showMessage({ type: 'success', text: 'Account created. Check your email if confirmation is enabled.' });
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
          className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === 'password' ? 'bg-emerald-400 text-gray-950' : 'text-gray-300'}`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`rounded-xl px-3 py-2 text-sm font-bold ${mode === 'magic' ? 'bg-emerald-400 text-gray-950' : 'text-gray-300'}`}
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
            className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
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
                className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-gray-300">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional for sign-up"
                autoComplete="nickname"
                className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={signInWithPassword}
                className="rounded-full bg-emerald-400 px-5 py-3 font-black text-gray-950 disabled:opacity-50"
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={signUpWithPassword}
                className="rounded-full border border-white/10 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                Sign up
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={sendMagicLink}
            className="w-full rounded-full bg-emerald-400 px-5 py-3 font-black text-gray-950 disabled:opacity-50"
          >
            Send magic link
          </button>
        )}
      </div>

      {message && (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
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
