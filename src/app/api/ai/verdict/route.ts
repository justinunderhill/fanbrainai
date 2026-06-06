import { NextResponse } from 'next/server';
import { buildVerdictPrompt } from '@/lib/ai/prompts';
import { generateText } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, tooManyRequestsResponse } from '@/lib/rate-limit';
import type { MatchWithTeams, PredictionStyle } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const authClient = await createClient();
    const { data: auth } = await authClient.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = rateLimit(`ai:verdict:${auth.user.id}`, { limit: 15, windowMs: 60_000 });
    if (!limit.success) return tooManyRequestsResponse(limit.retryAfterSeconds);

    const body = await request.json() as {
      matchId: string;
      homeScore: number;
      awayScore: number;
      predictionStyle: PredictionStyle;
      reason?: string;
    };

    const supabase = createAdminClient();
    const { data: match, error } = await supabase.from('matches_with_teams').select('*').eq('id', body.matchId).single();
    if (error || !match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

    const prompt = buildVerdictPrompt({
      match: match as MatchWithTeams,
      predictedHomeScore: body.homeScore,
      predictedAwayScore: body.awayScore,
      predictionStyle: body.predictionStyle,
      userReason: body.reason,
    });
    const text = await generateText(prompt);

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
