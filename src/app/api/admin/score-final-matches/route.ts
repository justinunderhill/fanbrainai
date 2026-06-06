import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scorePrediction } from '@/lib/scoring';

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: finalMatches, error } = await supabase
    .from('matches')
    .select('id,home_score,away_score,status')
    .eq('status', 'final')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;

  for (const match of finalMatches ?? []) {
    const { data: predictions } = await supabase.from('predictions').select('*').eq('match_id', match.id);

    for (const prediction of predictions ?? []) {
      const points = scorePrediction({
        predictedHomeScore: prediction.predicted_home_score,
        predictedAwayScore: prediction.predicted_away_score,
        actualHomeScore: match.home_score,
        actualAwayScore: match.away_score,
      });

      await supabase.from('predictions').update({ points_awarded: points }).eq('id', prediction.id);
      updated += 1;
    }
  }

  return NextResponse.json({ updated });
}
