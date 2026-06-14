'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Flame, Loader2, Minus, Sparkles, Trophy, X } from 'lucide-react';
import { TeamFlag } from '@/components/TeamFlag';
import { SharePredictionButton } from '@/components/SharePredictionButton';
import { currentStreak, pointsBadge } from '@/lib/scoring';
import { getServerSnapshot, getSnapshot, persist, subscribe } from '@/lib/recap-store';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export type RecapItem = { prediction: Prediction; match: MatchWithTeams };

type DebriefState = { text: string | null; loading: boolean; failed: boolean };

export function ResultsRecap({ settled, rank }: { settled: RecapItem[]; rank: number | null }) {
  const router = useRouter();
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  // Overrides for debriefs generated this session, keyed by prediction id.
  const [fetched, setFetched] = useState<Record<string, DebriefState>>({});

  const newly = useMemo(
    () => settled.filter((s) => !stored.seenIds.includes(s.prediction.id)),
    [settled, stored],
  );

  // Lazily generate any missing debriefs, one at a time to respect the API rate limiter.
  useEffect(() => {
    if (newly.length === 0) return;
    let cancelled = false;
    const missing = newly.filter((s) => !s.prediction.ai_debrief);

    async function run() {
      let generated = false;
      for (const { prediction } of missing) {
        if (cancelled) return;
        setFetched((d) => ({ ...d, [prediction.id]: { text: null, loading: true, failed: false } }));
        try {
          const res = await fetch('/api/ai/debrief', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId: prediction.id }),
          });
          const data = await res.json();
          if (cancelled) return;
          if (res.ok) {
            generated = true;
            setFetched((d) => ({ ...d, [prediction.id]: { text: data.text, loading: false, failed: false } }));
          } else {
            setFetched((d) => ({ ...d, [prediction.id]: { text: null, loading: false, failed: true } }));
          }
        } catch {
          if (cancelled) return;
          setFetched((d) => ({ ...d, [prediction.id]: { text: null, loading: false, failed: true } }));
        }
      }
      // Re-sync server components (My Picks, leaderboard) now that debriefs/points persisted.
      if (generated && !cancelled) router.refresh();
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [newly, router]);

  const pointsBanked = useMemo(() => newly.reduce((sum, s) => sum + s.prediction.points_awarded, 0), [newly]);
  const hasExact = useMemo(() => newly.some((s) => s.prediction.points_awarded >= 5), [newly]);
  const streak = useMemo(() => currentStreak(settled), [settled]);
  const rankDelta = rank != null && stored.lastRank != null ? stored.lastRank - rank : null;

  if (dismissed || newly.length === 0) return null;

  function dismiss() {
    persist({ seenIds: settled.map((s) => s.prediction.id), lastRank: rank });
    setDismissed(true);
  }

  return (
    <section className="card-gradient animate-pop-in relative overflow-hidden rounded-[2rem] border border-emerald-400/30 p-6 shadow-glow sm:p-8">
      {hasExact && <Confetti />}
      <button
        onClick={dismiss}
        aria-label="Dismiss results recap"
        className="btn btn-ghost absolute right-4 top-4 h-9 w-9 p-0"
      >
        <X size={16} />
      </button>

      <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/12 px-4 py-2 text-sm font-bold text-emerald-100">
        <Sparkles size={16} /> Results are in
      </p>
      <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
        You banked <span className="text-emerald-300 tabular-nums">+{pointsBanked}</span> this round
      </h2>
      {rank != null && (
        <p className="mt-2 flex items-center gap-2 text-gray-300">
          <Trophy size={16} className="text-amber-200" />
          <span className="font-bold text-white">You&apos;re #{rank}</span>
          {rankDelta != null && rankDelta !== 0 && (
            <span className={`inline-flex items-center gap-1 font-bold ${rankDelta > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {rankDelta > 0 ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
              {Math.abs(rankDelta)} since you last checked
            </span>
          )}
          {rankDelta === 0 && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Minus size={15} /> holding steady
            </span>
          )}
        </p>
      )}
      {streak.current >= 2 && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-400/12 px-3 py-1.5 text-sm font-bold text-orange-200">
          <Flame size={15} /> {streak.current} correct calls in a row
          {streak.current >= streak.best && streak.best > 2 && <span className="text-orange-100/80">· your best yet</span>}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {newly.map(({ prediction, match }) => {
          const badge = pointsBadge(prediction.points_awarded);
          const debrief: DebriefState = fetched[prediction.id] ?? {
            text: prediction.ai_debrief,
            loading: false,
            failed: false,
          };
          return (
            <div key={prediction.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-2 font-bold">
                  <TeamFlag team={match.home_team} size="sm" />
                  <span className="tabular-nums">
                    {match.home_score ?? 0} – {match.away_score ?? 0}
                  </span>
                  <TeamFlag team={match.away_team} size="sm" />
                </span>
                <span className="text-sm text-gray-400">
                  you called <span className="font-bold text-emerald-300 tabular-nums">{prediction.predicted_home_score}–{prediction.predicted_away_score}</span>
                </span>
                <span className={`ml-auto rounded-full border px-3 py-1 text-sm font-bold ${badge.cls}`}>{badge.label}</span>
              </div>

              {debrief?.loading && (
                <p className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={15} className="animate-spin" /> FanBrain is breaking it down…
                </p>
              )}
              {debrief?.text && (
                <div className="mt-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-200">AI Debrief</p>
                  <p className="mt-1 text-gray-100">{debrief.text}</p>
                </div>
              )}
              {debrief?.failed && !debrief.text && (
                <Link href={`/matches/${match.id}`} className="nav-link mt-3 inline-block text-sm text-gray-400">
                  View debrief →
                </Link>
              )}
              <SharePredictionButton
                token={prediction.share_token}
                homeTeam={match.home_team.name}
                awayTeam={match.away_team.name}
                homeScore={match.home_score ?? 0}
                awayScore={match.away_score ?? 0}
                predictedHome={prediction.predicted_home_score}
                predictedAway={prediction.predicted_away_score}
                points={prediction.points_awarded}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/predictions" className="btn btn-primary px-5 py-2.5 text-sm">See all my picks</Link>
        <button onClick={dismiss} className="btn btn-ghost px-5 py-2.5 text-sm">Got it</button>
      </div>
    </section>
  );
}

const CONFETTI_COLORS = ['#34d399', '#fbbf24', '#38bdf8', '#f472b6', '#a78bfa'];

function Confetti() {
  // Deterministic-enough scatter generated once on mount; CSS does the rest.
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i / 36) * 100 + (i % 3) * 4}%`,
        delay: `${(i % 9) * 0.06}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: `${(i * 47) % 360}deg`,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute top-0 h-2.5 w-1.5 rounded-[1px]"
          style={{ left: p.left, animationDelay: p.delay, backgroundColor: p.color, rotate: p.rotate }}
        />
      ))}
    </div>
  );
}
