import { NextResponse } from 'next/server';
import { buildDebriefPrompt } from '@/lib/ai/prompts';
import { generateText } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { scorePrediction } from '@/lib/scoring';
import type { MatchWithTeams } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { predictionId: string };
    const supabase = createAdminClient();

    const { data: prediction, error: predictionError } = await supabase.from('predictions').select('*').eq('id', body.predictionId).single();
    if (predictionError || !prediction) return NextResponse.json({ error: 'Prediction not found.' }, { status: 404 });

    const { data: match, error: matchError } = await supabase.from('matches_with_teams').select('*').eq('id', prediction.match_id).single();
    if (matchError || !match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

    const typedMatch = match as MatchWithTeams;
    if (typedMatch.status !== 'final' || typedMatch.home_score == null || typedMatch.away_score == null) {
      return NextResponse.json({ error: 'Match is not final yet.' }, { status: 400 });
    }

    const points = scorePrediction({
      predictedHomeScore: prediction.predicted_home_score,
      predictedAwayScore: prediction.predicted_away_score,
      actualHomeScore: typedMatch.home_score,
      actualAwayScore: typedMatch.away_score,
    });

    const text = await generateText(buildDebriefPrompt({
      match: typedMatch,
      predictedHomeScore: prediction.predicted_home_score,
      predictedAwayScore: prediction.predicted_away_score,
      points,
    }));

    await supabase.from('predictions').update({ ai_debrief: text, points_awarded: points }).eq('id', prediction.id);

    return NextResponse.json({ text, points });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
