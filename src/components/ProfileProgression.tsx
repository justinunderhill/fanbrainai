import { Activity, CheckCircle2 } from 'lucide-react';
import { TRAIT_LABEL, type RecentLean, type Trait } from '@/lib/profile-progression';

const TRAIT_TONE: Record<Trait, string> = {
  logic: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  chaos: 'border-orange-300/30 bg-orange-300/10 text-orange-100',
  loyalty: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
  risk: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
};

const ORDER: Trait[] = ['logic', 'chaos', 'loyalty', 'risk'];

/**
 * Post-unlock progression: shows how picks made since the profile was last generated lean
 * across the four traits, so the profile reads as evolving rather than frozen. Purely
 * descriptive — it never mutates the AI-generated scores; the regenerate button on the
 * profile card is what actually refreshes them.
 */
export function ProfileProgression({ lean }: { lean: RecentLean }) {
  if (lean.count === 0) {
    return (
      <section className="card-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-glow">
        <div className="relative flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-300" />
          <div>
            <h3 className="font-black text-white">Profile is up to date</h3>
            <p className="mt-1 text-sm text-gray-300">
              This read reflects every pick you&rsquo;ve made. Predict more matches and your traits will
              shift the next time you regenerate.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const topLabel = lean.top ? TRAIT_LABEL[lean.top] : null;

  return (
    <section className="card-gradient relative overflow-hidden rounded-3xl border border-emerald-300/20 p-6 shadow-glow">
      <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-50" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Activity size={18} className="shrink-0 text-emerald-300" />
          <h3 className="font-black text-white">
            {lean.count} new {lean.count === 1 ? 'pick' : 'picks'} since this profile
          </h3>
        </div>
        <p className="mt-1 text-sm text-gray-300">
          {topLabel
            ? `Your recent calls lean ${topLabel}. Regenerate to fold them into your traits.`
            : 'Regenerate to fold your recent calls into your traits.'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDER.map((trait) => {
            const n = lean.byTrait[trait];
            const isTop = trait === lean.top;
            return (
              <div
                key={trait}
                className={`rounded-2xl border p-3 ${n > 0 ? TRAIT_TONE[trait] : 'border-white/10 bg-white/[0.03] text-gray-500'}`}
              >
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">{TRAIT_LABEL[trait]}</p>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums">{n}</span>
                  {isTop && <span className="text-xs font-bold uppercase tracking-wide opacity-80">top</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
