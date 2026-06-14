'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareButtons } from '@/components/ShareButtons';

/**
 * A compact "Share" button that expands to the full ShareButtons card on click.
 * Keeps share affordances inline (rows, recap cards, leaderboard hero) without each
 * one taking permanent vertical space. All ShareButtons props pass straight through.
 */
export function CollapsibleShare({
  buttonLabel = 'Share',
  className,
  ...shareProps
}: {
  buttonLabel?: string;
  className?: string;
} & React.ComponentProps<typeof ShareButtons>) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost px-4 py-2 text-sm">
        <Share2 size={15} /> {open ? 'Hide share options' : buttonLabel}
      </button>
      {open && (
        <div className="mt-3 animate-slide-up">
          <ShareButtons {...shareProps} />
        </div>
      )}
    </div>
  );
}
