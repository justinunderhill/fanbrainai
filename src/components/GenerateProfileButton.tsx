'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

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
    <div className="mt-5">
      <button onClick={generateProfile} disabled={loading} className="btn btn-primary px-6 py-3">
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? 'Generating...' : 'Generate AI fan profile'}
      </button>
      {message && <p className="mt-3 animate-slide-up text-sm text-gray-300">{message}</p>}
    </div>
  );
}
