'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function sendMagicLink() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      setMessage(error ? error.message : 'Check your email for the sign-in link.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start sign-in.');
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h1 className="text-3xl font-black">Sign in</h1>
      <p className="mt-2 text-gray-400">Use a magic link. No password needed for the MVP.</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-5 w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3" />
      <button onClick={sendMagicLink} className="mt-4 w-full rounded-full bg-emerald-400 px-5 py-3 font-black text-gray-950">Send magic link</button>
      {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
    </div>
  );
}
