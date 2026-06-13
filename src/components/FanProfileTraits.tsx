import { Gauge } from 'lucide-react';

export type TraitScores = {
  logic_score: number;
  chaos_score: number;
  loyalty_score: number;
  risk_score: number;
};

/** Prediction-trait panel shared by the private profile page and the public share page. */
export function FanProfileTraits({ scores }: { scores: TraitScores }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gray-950/55 p-5 shadow-glow">
      <div className="mb-4 flex items-center gap-2">
        <Gauge size={18} className="shrink-0 text-emerald-300" />
        <h3 className="font-black">Prediction traits</h3>
      </div>
      <div className="space-y-3">
        <Metric label="Logic" value={scores.logic_score} tone="emerald" />
        <Metric label="Chaos" value={scores.chaos_score} tone="orange" />
        <Metric label="Loyalty" value={scores.loyalty_score} tone="sky" />
        <Metric label="Risk" value={scores.risk_score} tone="amber" />
      </div>
    </div>
  );
}

export function Metric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'orange' | 'sky' | 'amber' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const toneClass = {
    emerald: 'from-emerald-300 to-teal-400',
    orange: 'from-orange-300 to-rose-400',
    sky: 'from-sky-300 to-cyan-400',
    amber: 'from-amber-200 to-yellow-400',
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-bold text-gray-200">{label}</p>
        <p className="text-2xl font-black tabular-nums text-white">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClass}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
