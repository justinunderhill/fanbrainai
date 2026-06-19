'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { SITE_URL } from '@/lib/site-url';

/** Copyable invite link for a league, with a native share sheet when available. */
export function InviteLink({ inviteCode, leagueName }: { inviteCode: string; leagueName: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/leagues/join/${inviteCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the link stays visible to copy manually.
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join my FanBrain league: ${leagueName}`,
          text: `Join my World Cup prediction league "${leagueName}" on FanBrain.`,
          url,
        });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
    } else {
      copy();
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/[0.07] p-4">
      <p className="text-sm font-black text-emerald-100">Invite friends</p>
      <p className="mt-1 text-sm text-gray-300">Anyone with this link can join the league.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <code className="flex-1 truncate rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm text-gray-200">{url}</code>
        <div className="flex gap-2">
          <button onClick={copy} className="btn btn-ghost px-4 py-3" aria-label="Copy invite link">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={share} className="btn btn-primary px-4 py-3" aria-label="Share invite link">
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
