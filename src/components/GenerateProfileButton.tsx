'use client';

import { useState } from 'react';

export function GenerateProfileButton({ userId, displayName }: { userId: string; displayName?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generateProfile() {
    setLoading(true);
    setMessage(null);
    const response = await fetch('/api/ai/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, displayName }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? 'Could not generate profile.');
    } else {
      setMessage('Profile generated. Refresh the page to view it.');
    }
    setLoading(false);
  }

  return (
    <button onClick={generateProfile} disabled={loading} className="mt-5 rounded-full bg-emerald-400 px-5 py-3 font-black text-gray-950 disabled:opacity-50">
      {loading ? 'Generating...' : 'Generate AI fan profile'}
      {message && <span className="mt-3 block text-left text-sm font-normal text-gray-950">{message}</span>}
    </button>
  );
}
