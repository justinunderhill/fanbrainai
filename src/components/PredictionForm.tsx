'use client';

import { useState } from 'react';
import type { MatchWithTeams, PredictionStyle } from '@/lib/types';
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

export function PredictionForm({ match }: { match: MatchWithTeams }) {
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(1);
  const [predictionStyle, setPredictionStyle] = useState<PredictionStyle>('head');
  const [reason, setReason] = useState('');
  const [aiVerdict, setAiVerdict] = useState<string | null>(null);
  const [aiRoast, setAiRoast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [renderedAt] = useState(() => Date.now());

  async function submitPrediction() {
    setLoading(true);
    setMessage(null);
    setAiVerdict(null);
    setAiRoast(null);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setMessage('Please sign in before submitting a prediction.');
      setLoading(false);
      return;
    }

    const payload = {
      user_id: auth.user.id,
      match_id: match.id,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      predicted_outcome: getOutcome(homeScore, awayScore),
      prediction_style: predictionStyle,
      user_reason: reason,
    };

    const { error } = await supabase.from('predictions').upsert(payload, {
      onConflict: 'user_id,match_id',
    });

    if (error) {
      setMessage(error.message);
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
      await supabase
        .from('predictions')
        .update({ ai_verdict: verdict.text })
        .eq('user_id', auth.user.id)
        .eq('match_id', match.id);
    }

    setMessage('Prediction saved. FanBrain has judged your football brain.');
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

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user && roast.text) {
      await supabase
        .from('predictions')
        .update({ ai_roast: roast.text })
        .eq('user_id', auth.user.id)
        .eq('match_id', match.id);
    }
    setLoading(false);
  }

  const locked = new Date(match.kickoff_time).getTime() <= renderedAt;

  if (locked) {
    return <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">Predictions are locked for this match.</div>;
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-1 text-xl font-black">Make your prediction</h2>
      <p className="mb-5 text-sm text-gray-400">Pick the score, choose your fan-brain mode, and let AI react.</p>

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className="text-sm text-gray-300">{match.home_team.name}</span>
          <input type="number" min="0" max="15" value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-xl font-black" />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">{match.away_team.name}</span>
          <input type="number" min="0" max="15" value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-xl font-black" />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {styles.map((item) => (
          <button key={item.value} type="button" onClick={() => setPredictionStyle(item.value)} className={`rounded-2xl border px-3 py-2 text-sm ${predictionStyle === item.value ? 'border-emerald-400 bg-emerald-400 text-gray-950' : 'border-white/10 bg-white/5 text-gray-200'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional: explain your pick in one sentence..." className="mt-4 min-h-24 w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm" />

      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={loading} onClick={submitPrediction} className="rounded-full bg-emerald-400 px-5 py-3 font-black text-gray-950 disabled:opacity-50">Save prediction</button>
        <button disabled={loading} onClick={roastPrediction} className="rounded-full border border-white/10 px-5 py-3 font-bold text-white disabled:opacity-50">Roast my pick</button>
      </div>

      {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
      {aiVerdict && <div className="mt-4 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-4"><p className="text-sm font-bold text-emerald-200">AI Verdict</p><p className="mt-2 text-gray-100">{aiVerdict}</p></div>}
      {aiRoast && <div className="mt-4 rounded-3xl border border-pink-400/30 bg-pink-400/10 p-4"><p className="text-sm font-bold text-pink-200">Roast Mode</p><p className="mt-2 text-gray-100">{aiRoast}</p></div>}
    </section>
  );
}
