'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function GenerateProfileButton({
  userId,
  displayName,
  hasProfile = false,
}: {
  userId: string;
  displayName?: string | null;
  hasProfile?: boolean;
}) {
  const router = useRouter();
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
      setLoading(false);
      return;
    }
    setMessage(hasProfile ? 'Profile updated.' : 'Profile generated.');
    setLoading(false);
    // Re-render the server component so the new/updated profile shows immediately.
    router.refresh();
  }

  const idleLabel = hasProfile ? 'Regenerate profile' : 'Generate AI fan profile';
  const busyLabel = hasProfile ? 'Regenerating...' : 'Generating...';

  return (
    <div className="mt-5">
      <button
        onClick={generateProfile}
        disabled={loading}
        className={`btn px-6 py-3 ${hasProfile ? 'btn-ghost' : 'btn-primary'}`}
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? busyLabel : idleLabel}
      </button>
      {message && <p className="mt-3 animate-slide-up text-sm text-gray-300">{message}</p>}
    </div>
  );
}
