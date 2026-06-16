import Link from 'next/link';
import { ArrowRight, BrainCircuit, Clock3, LogIn, Sparkles, Target } from 'lucide-react';
import type { NextAction, NextActionKind } from '@/lib/next-action';

const ICONS: Record<NextActionKind, React.ComponentType<{ size?: number; className?: string }>> = {
  'signed-out': LogIn,
  'no-picks': Target,
  'under-5-picks': BrainCircuit,
  'pending-results': Clock3,
  'all-settled': Sparkles,
};

export function NextActionCard({ action, className = '' }: { action: NextAction; className?: string }) {
  const Icon = ICONS[action.kind];
  const percent = action.progress ? Math.min(100, Math.round((action.progress.value / action.progress.max) * 100)) : 0;

  return (
    <section className={`card-gradient relative overflow-hidden rounded-3xl border border-emerald-300/25 p-5 shadow-glow ${className}`}>
      <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-60" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-gray-950">
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-200">{action.eyebrow}</p>
            <h2 className="mt-1 text-xl font-black text-white">{action.title}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-300">{action.body}</p>
            {action.progress && (
              <div className="mt-3 max-w-sm">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>{action.progress.label}</span>
                  <span>{percent}%</span>
                </div>
                <div
                  className="h-2 rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={action.progress.value}
                  aria-valuemin={0}
                  aria-valuemax={action.progress.max}
                  aria-label={action.progress.label}
                >
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Link href={action.href} className="btn btn-primary px-5 py-2.5 text-sm">
            {action.label}
            <ArrowRight size={16} />
          </Link>
          {action.secondaryHref && action.secondaryLabel && (
            <Link href={action.secondaryHref} className="btn btn-ghost px-5 py-2.5 text-sm">
              {action.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
