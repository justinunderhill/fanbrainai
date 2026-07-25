'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Loader2, Sparkles } from 'lucide-react';
import type { MatchWithTeams, Prediction, PredictionStyle } from '@/lib/types';
import { PushOptIn } from '@/components/PushOptIn';
import { SignInToPredictPanel } from '@/components/SignInToPredictPanel';
import { TeamBadge } from '@/components/TeamBadge';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/browser';
import { getOutcome } from '@/lib/utils';

const styles: { value: PredictionStyle; label: string }[] = [
  { value: 'head', label: 'Head says' },
  { value: 'heart', label: 'Heart says' },
  { value: 'chaos', label: 'Chaos pick' },
  { value: 'underdog', label: 'Underdog pick' },
  { value: 'tactical', label: 'Tactical pick' },
  { value: 'vibes', label: 'Vibes only' },
];

function getPredictionErrorMessage(errorMessage?: string) {
  if (!errorMessage) return 'Could not save your prediction. Please try again.';

  const normalized = errorMessage.toLowerCase();

  if (normalized.includes('jwt') || normalized.includes('not authenticated') || normalized.includes('unauthorized')) {
    return 'Please sign in again before saving your prediction.';
  }

  if (normalized.includes('permission denied') || normalized.includes('row-level security')) {
    return 'Could not save your prediction because the database rejected the write. Please refresh and try again.';
  }

  if (normalized.includes('predictions are locked')) {
    return 'Predictions are locked for this match.';
  }

  if (normalized.includes('duplicate key')) {
    return 'You already have a prediction for this match. Refresh and try updating it again.';
  }

  return 'Could not save your prediction. Please check the scores and try again.';
}

export function PredictionForm({
  match,
  initialPrediction = null,
  nextMatch = null,
}: {
  match: MatchWithTeams;
  initialPrediction?: Prediction | null;
  nextMatch?: MatchWithTeams | null;
}) {
  const { loading: authLoading, user: authUser } = useAuth();
  const isEditing = Boolean(initialPrediction);
  // Seed from the existing pick (lazy initializers run once, so no flash).
  const [homeScore, setHomeScore] = useState(() => initialPrediction?.predicted_home_score ?? 1);
  const [awayScore, setAwayScore] = useState(() => initialPrediction?.predicted_away_score ?? 1);
  // Which team the fan calls to advance on penalties; only meaningful for a level
  // knockout pick (the toggle below). Seeded from the existing pick.
  const [advanceTeamId, setAdvanceTeamId] = useState<string | null>(() => initialPrediction?.predicted_winner_team_id ?? null);
  const [predictionStyle, setPredictionStyle] = useState<PredictionStyle>(() => initialPrediction?.prediction_style ?? 'head');
  const [reason, setReason] = useState(() => initialPrediction?.user_reason ?? '');
  const [aiVerdict, setAiVerdict] = useState<string | null>(initialPrediction?.ai_verdict ?? null);
  const [aiRoast, setAiRoast] = useState<string | null>(initialPrediction?.ai_roast ?? null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Once a pick is saved we surface "what's next" navigation so the user isn't
  // stranded on this page with only the top nav to escape.
  const [saved, setSaved] = useState(isEditing);
  // Flips true only after a brand-new prediction is saved, which is when we offer
  // result notifications (PushOptIn self-gates on support + prior dismissal).
  const [offerPush, setOfferPush] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  // The score/style the current verdict was generated for, so an edit that only
  // touches the reason text doesn't burn an AI call (and the rate limit).
  const lastVerdictPick = useRef(
    initialPrediction?.ai_verdict
      ? {
          home: initialPrediction.predicted_home_score,
          away: initialPrediction.predicted_away_score,
          style: initialPrediction.prediction_style,
        }
      : null,
  );

  // A level knockout pick needs a winner — in the knockouts a draw can't stand, so we ask
  // who goes through on penalties. Hidden for group/league games and decisive scorelines.
  const showAdvanceToggle = match.is_knockout && homeScore === awayScore;
  const advanceMissing = showAdvanceToggle && !advanceTeamId;

  async function submitPrediction() {
    setLoading(true);
    setMessage(null);
    setAiVerdict(null);
    setAiRoast(null);

    if (!authUser) {
      setMessage('Please sign in again before saving your prediction.');
      setLoading(false);
      return;
    }

    if (advanceMissing) {
      setMessage('Pick who goes through on penalties — a draw can’t stand in the knockouts.');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const predictionFields = {
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      predicted_outcome: getOutcome(homeScore, awayScore),
      // Only persist an advance pick for a level knockout call; clear it otherwise so a
      // pick edited from a draw to a decisive score doesn't keep a stale winner.
      predicted_winner_team_id: showAdvanceToggle ? advanceTeamId : null,
      prediction_style: predictionStyle,
      user_reason: reason,
    };

    const { data: existingPrediction, error: existingPredictionError } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('match_id', match.id)
      .maybeSingle();

    if (existingPredictionError) {
      setMessage(getPredictionErrorMessage(existingPredictionError.message));
      setLoading(false);
      return;
    }

    const { error } = existingPrediction
      ? await supabase
        .from('predictions')
        .update(predictionFields)
        .eq('id', existingPrediction.id)
      : await supabase
        .from('predictions')
        .insert({
          user_id: authUser.id,
          match_id: match.id,
          ...predictionFields,
        });

    if (error) {
      setMessage(getPredictionErrorMessage(error.message));
      setLoading(false);
      return;
    }

    setSaved(true);
    // A new pick (no pre-existing row) is the moment to offer result alerts.
    if (!existingPrediction) setOfferPush(true);

    // Only (re)generate the AI verdict when the score or style actually changed.
    // Editing just the reason text keeps the existing verdict and saves a call.
    const previous = lastVerdictPick.current;
    const pickChanged =
      !previous ||
      previous.home !== homeScore ||
      previous.away !== awayScore ||
      previous.style !== predictionStyle;

    if (!pickChanged) {
      setMessage('Prediction updated.');
      setLoading(false);
      return;
    }

    const verdictResponse = await fetch('/api/ai/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, homeScore, awayScore, predictionStyle, reason }),
    });
    const verdict = await verdictResponse.json();
    if (!verdictResponse.ok) {
      setMessage(verdict.error ?? 'Prediction saved, but FanBrain could not generate a verdict.');
      setLoading(false);
      return;
    }

    setAiVerdict(verdict.text ?? null);
    if (verdict.text) {
      lastVerdictPick.current = { home: homeScore, away: awayScore, style: predictionStyle };
      await supabase
        .from('predictions')
        .update({ ai_verdict: verdict.text })
        .eq('user_id', authUser.id)
        .eq('match_id', match.id);
    }

    setMessage(
      isEditing
        ? 'Prediction updated. FanBrain has re-judged your call.'
        : 'Prediction saved. FanBrain has judged your football brain.',
    );
    setLoading(false);
  }

  async function roastPrediction() {
    setLoading(true);
    setMessage(null);
    const roastResponse = await fetch('/api/ai/roast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, homeScore, awayScore, predictionStyle }),
    });
    const roast = await roastResponse.json();
    if (!roastResponse.ok) {
      setMessage(roast.error ?? 'Could not generate a roast.');
      setLoading(false);
      return;
    }

    setAiRoast(roast.text ?? null);

    if (authUser && roast.text) {
      const supabase = createClient();
      await supabase
        .from('predictions')
        .update({ ai_roast: roast.text })
        .eq('user_id', authUser.id)
        .eq('match_id', match.id);
    }
    setLoading(false);
  }

  const locked = new Date(match.kickoff_time).getTime() <= renderedAt;

  if (!authLoading && !authUser) {
    return <SignInToPredictPanel returnTo={`/matches/${match.id}`} />;
  }

  if (locked) {
    if (!initialPrediction) {
      return <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">Predictions are locked for this match.</div>;
    }
    const styleLabel = styles.find((s) => s.value === initialPrediction.prediction_style)?.label ?? initialPrediction.prediction_style;
    return (
      <section className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-amber-100">Your locked-in pick</h2>
          <span className="rounded-full border border-amber-400/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200">Locked</span>
        </div>
        <p className="mt-1 text-sm text-amber-200/80">Predictions are closed for this match — here&apos;s what you called.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-amber-50">
          <span className="text-3xl font-black tabular-nums">{initialPrediction.predicted_home_score} – {initialPrediction.predicted_away_score}</span>
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-bold">{styleLabel}</span>
          {(() => {
            const advanceTeam = [match.home_team, match.away_team].find((t) => t.id === initialPrediction.predicted_winner_team_id);
            return advanceTeam ? (
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-bold">{advanceTeam.name} to advance</span>
            ) : null;
          })()}
        </div>
        {initialPrediction.user_reason && <p className="mt-3 text-sm text-amber-100/90">&ldquo;{initialPrediction.user_reason}&rdquo;</p>}
        {aiVerdict && <div className="mt-4 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-4"><p className="text-sm font-bold text-emerald-200">AI Verdict</p><p className="mt-2 text-gray-100">{aiVerdict}</p></div>}
        {aiRoast && <div className="mt-4 rounded-3xl border border-pink-400/30 bg-pink-400/10 p-4"><p className="text-sm font-bold text-pink-200">Roast Mode</p><p className="mt-2 text-gray-100">{aiRoast}</p></div>}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-amber-400/20 pt-5">
          <Link href="/matches" className="btn btn-primary px-5 py-3">
            Pick another match
            <ArrowRight size={18} />
          </Link>
          <Link href="/predictions" className="btn btn-ghost px-5 py-3">View your predictions</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-1 text-xl font-black">{isEditing ? 'Update your prediction' : 'Make your prediction'}</h2>
      <p className="mb-5 text-sm text-gray-400">
        {isEditing
          ? `You called ${initialPrediction!.predicted_home_score}–${initialPrediction!.predicted_away_score}. Tweak it before kickoff and FanBrain will re-react.`
          : 'Pick the score, choose your fan-brain mode, and let AI react.'}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <ScoreStepper team={match.home_team} value={homeScore} onChange={setHomeScore} />
        <ScoreStepper team={match.away_team} value={awayScore} onChange={setAwayScore} />
      </div>

      {showAdvanceToggle && (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
          <p className="text-sm font-bold text-amber-100">{match.stage} — who goes through on penalties?</p>
          <p className="mt-1 text-xs text-amber-200/80">A draw can’t stand in the knockouts. Call the shootout to keep your pick alive.</p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Who advances on penalties">
            {[match.home_team, match.away_team].map((team) => {
              const selected = advanceTeamId === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setAdvanceTeamId(team.id)}
                  aria-pressed={selected}
                  className={`chip flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold ${
                    selected
                      ? 'scale-[1.03] border-amber-300 bg-amber-300 text-gray-950 shadow-glow-strong'
                      : 'border-white/10 bg-white/5 text-gray-200 hover:border-amber-300/40 hover:bg-white/10'
                  }`}
                >
                  <TeamBadge team={team} size="sm" />
                  <span className="truncate">{team.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Prediction style">
        {styles.map((item) => {
          const selected = predictionStyle === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setPredictionStyle(item.value)}
              aria-pressed={selected}
              className={`chip rounded-2xl border px-3 py-2 text-sm font-bold ${
                selected
                  ? 'scale-[1.03] border-emerald-400 bg-emerald-400 text-gray-950 shadow-glow-strong'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:border-emerald-400/40 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <textarea value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Why this pick? (optional)" placeholder="Optional: explain your pick in one sentence..." className="input-game mt-4 min-h-24 w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm" />

      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={loading || advanceMissing} onClick={submitPrediction} className="btn btn-primary px-6 py-3">
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? 'Saving...' : isEditing ? 'Update prediction' : 'Save prediction'}
        </button>
        {!saved && (
          <button disabled={loading} onClick={roastPrediction} className="btn btn-ghost px-6 py-3">
            <Flame size={18} />
            Roast my pick
          </button>
        )}
      </div>

      {message && <p className="mt-4 animate-slide-up text-sm text-gray-300">{message}</p>}
      {aiVerdict && <div className="mt-4 animate-pop-in rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-4"><p className="text-sm font-bold text-emerald-200">AI Verdict</p><p className="mt-2 text-gray-100">{aiVerdict}</p></div>}
      {aiRoast && <div className="mt-4 animate-pop-in rounded-3xl border border-pink-400/30 bg-pink-400/10 p-4"><p className="text-sm font-bold text-pink-200">Roast Mode</p><p className="mt-2 text-gray-100">{aiRoast}</p></div>}

      {saved && (
        <div className="mt-5 animate-slide-up rounded-3xl border border-emerald-300/25 bg-emerald-400/[0.07] p-4">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-100">
            <Sparkles size={16} /> What next?
          </p>
          <p className="mt-1 text-sm text-gray-300">
            {nextMatch
              ? `Keep the loop moving with ${nextMatch.home_team.name} vs ${nextMatch.away_team.name}.`
              : 'Your pick is saved. Check your list or browse the match schedule.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-4">
            <Link href={nextMatch ? `/matches/${nextMatch.id}` : '/matches'} className="btn btn-primary px-5 py-3">
              {nextMatch ? 'Predict next match' : 'Pick another match'}
              <ArrowRight size={18} />
            </Link>
            {!aiRoast && (
              <button disabled={loading} onClick={roastPrediction} className="btn btn-ghost px-5 py-3">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />}
                Roast this pick
              </button>
            )}
            <Link href="/predictions" className="btn btn-ghost px-5 py-3">View picks</Link>
          </div>
        </div>
      )}

      <PushOptIn active={offerPush} />
    </section>
  );
}

function ScoreStepper({
  team,
  value,
  onChange,
}: {
  team: MatchWithTeams['home_team'];
  value: number;
  onChange: (next: number) => void;
}) {
  const clamp = (next: number) => Math.max(0, Math.min(15, next));
  const label = team.name;

  return (
    <div className="space-y-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-gray-300">
        <TeamBadge team={team} size="sm" />
        <span className="truncate">{label}</span>
      </span>
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-gray-950 p-2">
        <button
          type="button"
          aria-label={`Decrease ${label} score`}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 0}
          className="btn btn-ghost h-11 w-11 shrink-0 text-2xl leading-none"
        >
          −
        </button>
        <span key={value} className="animate-pop min-w-[1.5ch] text-center text-4xl font-black tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label} score`}
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= 15}
          className="btn btn-primary h-11 w-11 shrink-0 text-2xl leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
