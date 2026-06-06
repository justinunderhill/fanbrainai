import { NextResponse } from 'next/server';
import { buildProfilePrompt } from '@/lib/ai/prompts';
import { generateText } from '@/lib/ai/openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, tooManyRequestsResponse } from '@/lib/rate-limit';

type FanProfileResponse = {
  personality_type: string;
  logic_score: number;
  chaos_score: number;
  loyalty_score: number;
  risk_score: number;
  summary: string;
};

// LLMs often wrap JSON in markdown fences (```json ... ```) or add stray
// prose. Pull out the JSON object before parsing.
function extractJsonObject(raw: string): string {
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }

  return text;
}

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

    const limit = rateLimit(`ai:profile:${userId}`, { limit: 6, windowMs: 60_000 });
    if (!limit.success) return tooManyRequestsResponse(limit.retryAfterSeconds);

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

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonObject(raw));
    } catch {
      return NextResponse.json({ error: 'AI profile response was not valid JSON.' }, { status: 502 });
    }

    if (!isFanProfileResponse(parsed)) {
      return NextResponse.json({ error: 'AI profile response was not valid.' }, { status: 502 });
    }

    await supabase.from('fan_profiles').upsert({ user_id: userId, ...parsed, updated_at: new Date().toISOString() });

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
