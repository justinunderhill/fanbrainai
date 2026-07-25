# AGENTS.md — FanBrain AI

## Project mission
Build **FanBrain AI**, a mobile-first, social sports prediction and fan-engagement app. Launched for the 2026 World Cup; now expanding into a year-round, multi-competition football platform (see `docs/product/PRODUCT_STRATEGY.md`), with rugby/cricket/F1 planned after football is established. This is not a betting product and not an official FIFA/league product. It lets fans make predictions, get AI-powered verdicts/roasts/debriefs, and build a dynamic fan personality profile based on their prediction behaviour.

## Architecture rules for the multi-competition expansion
- **Provider-neutral data layer** (ADR-001, `docs/decisions/ADR-001-provider-neutral-sports-data.md`): the frontend and prediction/settlement logic never call a commercial sports API directly. All provider data passes through a per-provider adapter in `src/lib/fixtures/` that normalizes into FanBrain's own row shapes before touching Supabase. No commercial API key may reach the browser bundle.
- **Migrations, not manual schema edits**: inspect `supabase/schema.sql` and existing migrations before changing anything. New schema changes are additive migration files (`supabase/migrations/000N_*.sql`), never edits to live tables by hand. Preserve production data — existing World Cup rows must keep rendering after any migration.
- **Don't build the full generic multi-sport model yet** (ADR-002, `docs/decisions/ADR-002-generic-event-and-prediction-model.md`): while only football is in scope, use the `competitions`/`matches.competition_id` shape in `docs/architecture/DATA_MODEL.md`, not a speculative `sports`/`prediction_market_types`/`settlement_runs` engine. Revisit that ADR before adding rugby.
- **Backward compatibility**: the existing World Cup experience (predictions, leaderboard, share pages) must keep working exactly as before through any migration or refactor in this expansion.

## Product principles
1. **AI-first, not AI-for-show**: AI should interpret, explain, classify, and entertain. It must not fabricate match facts, scores, fixtures, injuries, odds, or official tournament details.
2. **Fun and safe**: Roasts should be playful, witty, and non-abusive. Avoid hate, protected-class insults, profanity, and targeted harassment.
3. **No betting UX**: Do not use language such as odds, bet slip, wager, stake, cash out, or payout. This is a prediction game for entertainment.
4. **Factual separation**: Match data comes from the database/API. AI outputs are commentary layered on top of structured facts.
5. **Mobile-first**: Most users will interact from phones. Prioritise fast cards, thumb-friendly controls, and short copy.
6. **Portfolio-grade**: Code should be clean, explainable, and easy to demonstrate in a LinkedIn post or technical walkthrough.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase for auth, database, row-level security
- OpenAI API for AI verdicts, roasts, profiles, and debriefs
- External football API integration can be added later via scheduled sync jobs
- Vercel for deployment

## Current MVP scope
### Must have
- View matches
- View match detail
- Sign in/sign up with Supabase auth
- Submit score prediction before kickoff
- Generate AI verdict after prediction
- Generate optional AI roast
- Award points once result is final
- Leaderboard
- Fan profile/personality generation after enough predictions

### Nice to have later
- Private leagues
- Share cards
- Cron-driven fixture/result import
- Team form data
- AI match previews
- WhatsApp sharing
- Push notifications

## Important files
- `src/lib/types.ts`: shared domain types
- `src/lib/scoring.ts`: deterministic scoring logic
- `src/lib/ai/prompts.ts`: AI prompt builders and guardrails
- `src/app/api/ai/*`: AI route handlers
- `supabase/schema.sql`: database schema, RLS, views
- `supabase/seed.sql`: small starter data set

## Coding standards
- Use TypeScript strictly.
- Keep AI prompts in `src/lib/ai/prompts.ts`, not scattered across components.
- Keep scoring deterministic and testable. AI must never award points.
- Prefer server routes for AI calls. Never expose `OPENAI_API_KEY` in the browser.
- Supabase anon key may be exposed client-side. Service role key must only be used server-side.
- Do not hardcode secrets.
- Do not use official FIFA logos, marks, or branding assets.
- Use neutral tournament language such as “global football tournament” or factual “2026 World Cup” references.

## AI output rules
For AI verdicts:
- 40–80 words
- Entertaining, analytical, not overly serious
- Mention uncertainty
- Do not claim factual team news unless supplied in input context

For roasts:
- 20–45 words
- Playful only
- No slurs, protected class insults, or profanity
- Roast the prediction, not the person

For post-match debriefs:
- Compare predicted score/outcome to actual result
- Mention what the user read correctly and missed
- Grade A+ to F
- Do not overstate statistical certainty

For fan profile:
- Classify into one personality type
- Explain in a fun way
- Use the user’s prediction behaviour, not personal attributes

## Suggested development sequence for Codex / Claude Code
1. Install dependencies and run the app.
2. Create Supabase project and apply `supabase/schema.sql`.
3. Apply `supabase/seed.sql`.
4. Add environment variables from `.env.example`.
5. Confirm matches render on home and matches pages.
6. Confirm auth works.
7. Submit a prediction.
8. Confirm AI verdict generation works.
9. Confirm leaderboard view works.
10. Add a football API sync script once provider is selected.

## Do not do
- Do not turn this into a gambling or odds product.
- Do not scrape protected sources.
- Do not generate official-looking FIFA branding.
- Do not make AI the source of truth for fixtures or scores.
- Do not overbuild private leagues before core prediction loop works.
