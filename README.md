# FanBrain AI

A mobile-first, social sports prediction and fan-engagement app. Fans predict match scores, get AI verdicts and safe roasts, earn points and streaks, compete in private leagues, and unlock a dynamic fan personality profile.

Launched for the 2026 World Cup; now expanding into a year-round football platform (Premier League, UEFA Champions League, South African Premiership), with rugby, cricket, and Formula 1 planned after football is established. See `docs/product/PRODUCT_STRATEGY.md` for positioning and roadmap, and `docs/architecture/CURRENT_STATE_AUDIT.md` + `docs/architecture/DATA_MODEL.md` for where the codebase stands on that expansion.

This is an unofficial fan engagement project. Do not use official tournament marks, logos, or assets unless you have permission.

## What this starter includes

- Next.js App Router + TypeScript
- Tailwind UI
- Supabase auth, schema, RLS, seed data
- AI route handlers for verdicts, roasts, debriefs, and fan profiles
- Prediction scoring logic
- Leaderboard view
- Post-result recap ("return moment") with inline AI debriefs and rank movement
- `AGENTS.md` for Codex / Claude Code collaboration
- Placeholder fixture import script

## Requirements

- Node.js 20+
- Supabase project
- OpenAI API key
- Optional football data provider token for future fixture sync

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your environment variables to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## Supabase setup

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.
5. Enable email magic links in Supabase Auth.
6. Enable email/password sign-ins in Supabase Auth for local testing.
7. Add these redirect URLs in Supabase Auth settings:
   - `http://localhost:3000/auth/confirm`
   - your Vercel production URL + `/auth/confirm`

## Local auth testing

Magic-link auth can hit Supabase email rate limits during development. The `/auth` page also supports email/password auth so the MVP loop can be tested locally without waiting for emails.

1. In Supabase Auth settings, keep Email provider enabled.
2. Enable password sign-ins. For fastest local testing, disable email confirmation in the Supabase project used for development.
3. Start the app with `npm run dev`.
4. Open `/auth`, choose `Password`, and use `Sign up` with an email and password.
5. If email confirmation is disabled, the app redirects to `/matches` after sign-up or sign-in. If confirmation is enabled, confirm the email first, then sign in with the password.

Magic links remain available from the `Magic link` tab and still use `/auth/confirm`.

## MVP user flow

1. User opens matches.
2. User signs in by magic link or email/password.
3. User submits a score prediction.
4. App stores prediction in Supabase.
5. App calls `/api/ai/verdict` and displays an AI verdict.
6. User can request a safe roast.
7. When match results are updated as final, scoring can be applied.
8. Leaderboard ranks users by points.

## Scoring

- Exact score: 5 points
- Correct outcome only: 3 points
- Wrong outcome: 0 points

AI never awards points. `src/lib/scoring.ts` is the deterministic source of truth.

## Post-result recap ("return moment")

> **Scope note:** this is an enhancement added after the original MVP. The MVP shipped with
> silent background scoring and a manual, per-pick "Get AI debrief" button on *My Picks*. This
> feature surfaces the payoff automatically when a fan returns after their matches settle.

When predictions settle (the sync job flips a match to `final` and writes `points_awarded`), a
returning fan is greeted on the home page with a recap instead of having to go hunting for results:

- **Recap card** (`src/components/ResultsRecap.tsx`, mounted in `src/app/page.tsx`) — shows points
  banked this round and one row per newly-settled pick (final score vs. their call + points badge).
- **Inline AI debrief** — for each newly-settled pick without a debrief, it calls the existing
  `POST /api/ai/debrief` lazily (sequentially, to respect that route's per-user rate limiter) and
  renders the text as it arrives. Persisted debriefs show instantly; failures fall back to a link to
  the pick (where the original manual button still lives in `src/components/PredictionRow.tsx`).
- **Rank movement** (`src/components/YourRank.tsx`, mounted in `src/app/leaderboard/page.tsx`) — a
  "You're #N · ↑/↓ since you last checked" banner on the leaderboard.
- **Exact-score celebration** — a CSS-only confetti burst (no dependency; `confetti` keyframe in
  `tailwind.config.ts`) fires once when any newly-settled pick is an exact score.

### "Since last seen" tracking (no schema change)

Detecting "settled since your last visit" and "rank movement since last check" is anchored
**client-side in `localStorage`** via `src/lib/recap-store.ts`, read through `useSyncExternalStore`
so components derive state during render. This was a deliberate **zero-DDL** choice — it ships with
no migration and suits a friends/family audience. The only tradeoff is per-device state (seen/rank
are not synced across a user's devices). Future upgrade path if cross-device sync is ever wanted:
add a `users.last_recap_seen_at` column and read/write it server-side instead.

## Current status & roadmap

The World Cup 2026 loop (predict → AI verdict → score → leaderboard → share) is live in production. Multi-competition expansion is in the architecture/planning phase — see `docs/` for the full picture:

- `docs/architecture/CURRENT_STATE_AUDIT.md` — what's hardcoded to one tournament today.
- `docs/architecture/DATA_MODEL.md` — the additive schema change (draft migration at `supabase/migrations/0004_competitions.sql`, not yet applied to production).
- `docs/data-providers/PROVIDER_EVALUATION.md` — football-data.org (PL/CL) + API-Football (South African Premiership) provider decision.
- `docs/rollout/FOOTBALL_MVP.md` — rollout stages and acceptance criteria for the football expansion.
- `docs/decisions/` — ADRs recording the provider-neutral adapter pattern and the decision to defer a full multi-sport domain model until a second sport is actually in scope.

## Fixture data

The seed file contains a tiny starter dataset. For production, choose a provider and implement `scripts/import-fixtures.ts` or create a Vercel cron route.

Recommended provider approach:

- Store provider IDs in `external_match_id`.
- Upsert teams and matches.
- Keep all provider secrets server-side.
- Cache match data in Supabase rather than calling the provider from client components.

## Suggested Codex / Claude Code prompts

### First implementation pass

```text
Read AGENTS.md and README.md. Run a full project audit. Fix any TypeScript, Supabase, or Next.js issues that prevent local development. Keep the MVP scope tight and do not add new product features yet.
```

### Supabase integration pass

```text
Review supabase/schema.sql against the app code. Confirm all selected fields and RLS policies support the MVP flow. Fix mismatches and explain the changes.
```

### AI quality pass

```text
Improve the AI prompt layer in src/lib/ai/prompts.ts. Keep outputs short, safe, funny, and factual. Do not let AI invent match facts or betting-related content.
```

### Fixture sync pass

```text
Implement a provider-neutral fixture sync adapter. Keep provider logic isolated. Upsert teams and matches by external_match_id. Do not expose provider tokens in client code.
```

## Deployment

Deploy to Vercel and set the same environment variables in the Vercel dashboard.

Before public launch:

- Replace seed fixture data with the full provider-backed fixture list.
- Add error states for missing Supabase/OpenAI keys.
- Add rate limiting to AI routes.
- Add share cards only after the core loop works.
- Add moderation tests for roast mode.
