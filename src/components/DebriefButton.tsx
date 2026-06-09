'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

export function DebriefButton({
  predictionId,
  hasDebrief = false,
}: {
  predictionId: string;
  hasDebrief?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function getDebrief() {
    setLoading(true);
    setMessage(null);
    const response = await fetch('/api/ai/debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? 'Could not generate a debrief.');
      setLoading(false);
      return;
    }
    setLoading(false);
    // Re-render the server component so the persisted debrief shows immediately.
    router.refresh();
  }

  const idleLabel = hasDebrief ? 'Regenerate debrief' : 'Get AI debrief';
  const busyLabel = hasDebrief ? 'Regenerating...' : 'Analyzing...';

  return (
    <div className={hasDebrief ? 'mt-3' : ''}>
      <button onClick={getDebrief} disabled={loading} className="btn btn-ghost px-5 py-2.5 text-sm">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? busyLabel : idleLabel}
      </button>
      {message && <p className="mt-2 animate-slide-up text-sm text-gray-400">{message}</p>}
    </div>
  );
}
