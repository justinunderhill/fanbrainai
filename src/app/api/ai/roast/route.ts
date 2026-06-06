import { NextResponse } from 'next/server';
import { buildRoastPrompt } from '@/lib/ai/prompts';
import { generateText } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams, PredictionStyle } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const authClient = await createClient();
    const { data: auth } = await authClient.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      matchId: string;
      homeScore: number;
      awayScore: number;
      predictionStyle: PredictionStyle;
    };

    const supabase = createAdminClient();
    const { data: match, error } = await supabase.from('matches_with_teams').select('*').eq('id', body.matchId).single();
    if (error || !match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

    const prompt = buildRoastPrompt({
      match: match as MatchWithTeams,
      predictedHomeScore: body.homeScore,
      predictedAwayScore: body.awayScore,
      predictionStyle: body.predictionStyle,
    });
    const text = await generateText(prompt);

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
