'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Inline expand/collapse wrapper used to keep tall detail blocks (AI debrief,
 * share card) hidden until asked for. Lets the settled-picks list stay a compact,
 * scannable grid instead of a long vertical scroll.
 */
export function CollapsibleSection({
  label,
  openLabel,
  children,
}: {
  label: string;
  openLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-sm font-bold text-gray-300 transition-colors hover:text-white"
      >
        <span>{open ? openLabel ?? label : label}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4 animate-slide-up">{children}</div>}
    </div>
  );
}
