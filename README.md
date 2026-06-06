# FanBrain AI

A mobile-first AI football engagement app. Fans predict match scores, get AI verdicts and safe roasts, earn points, and unlock a dynamic fan personality profile.

This is an unofficial fan engagement project. Do not use official tournament marks, logos, or assets unless you have permission.

## What this starter includes

- Next.js App Router + TypeScript
- Tailwind UI
- Supabase auth, schema, RLS, seed data
- AI route handlers for verdicts, roasts, debriefs, and fan profiles
- Prediction scoring logic
- Leaderboard view
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
6. Add these redirect URLs in Supabase Auth settings:
   - `http://localhost:3000/auth/confirm`
   - your Vercel production URL + `/auth/confirm`

## MVP user flow

1. User opens matches.
2. User signs in by magic link.
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

