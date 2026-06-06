import { NextResponse } from 'next/server';
import { buildProfilePrompt } from '@/lib/ai/prompts';
import { generateText } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type FanProfileResponse = {
  personality_type: string;
  logic_score: number;
  chaos_score: number;
  loyalty_score: number;
  risk_score: number;
  summary: string;
};

function isFanProfileResponse(value: unknown): value is FanProfileResponse {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<Record<keyof FanProfileResponse, unknown>>;
  return (
    typeof profile.personality_type === 'string' &&
    typeof profile.logic_score === 'number' &&
    typeof profile.chaos_score === 'number' &&
    typeof profile.loyalty_score === 'number' &&
    typeof profile.risk_score === 'number' &&
    typeof profile.summary === 'string'
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { userId?: string; displayName?: string };
    const authClient = await createClient();
    const { data: auth } = await authClient.auth.getUser();

    if (!auth.user || (body.userId && body.userId !== auth.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;
    const supabase = createAdminClient();

    const { data: predictions } = await supabase
      .from('predictions')
      .select('predicted_home_score,predicted_away_score,predicted_outcome,prediction_style,points_awarded')
      .eq('user_id', userId)
      .limit(30);

    if (!predictions || predictions.length < 5) {
      return NextResponse.json({ error: 'At least five predictions are required to generate a profile.' }, { status: 400 });
    }

    const summary = predictions.map((p, i) => `${i + 1}. ${p.predicted_home_score}-${p.predicted_away_score}, outcome ${p.predicted_outcome}, style ${p.prediction_style}, points ${p.points_awarded}`).join('\n');
    const raw = await generateText(buildProfilePrompt({ displayName: body.displayName ?? 'This fan', predictionSummary: summary }));
    const parsed: unknown = JSON.parse(raw);

    if (!isFanProfileResponse(parsed)) {
      return NextResponse.json({ error: 'AI profile response was not valid.' }, { status: 502 });
    }

    await supabase.from('fan_profiles').upsert({ user_id: userId, ...parsed, updated_at: new Date().toISOString() });

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
