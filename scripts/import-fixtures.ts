/**
 * Placeholder fixture sync script.
 *
 * Recommended production approach:
 * 1. Pick one provider: Sportmonks, API-Football, Statorium, etc.
 * 2. Normalize provider data into `teams` and `matches`.
 * 3. Upsert by `external_match_id`.
 * 4. Run via Vercel Cron or Supabase Edge Function.
 *
 * Do not call this from the browser. Keep API tokens server-side.
 */

async function main() {
  console.log('Fixture import placeholder. Add provider-specific implementation here.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
