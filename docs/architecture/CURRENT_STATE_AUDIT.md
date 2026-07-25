# Current State Audit

**Date:** 2026-07-25
**Purpose:** Ground truth on what exists today, before any multi-competition/multi-sport work begins. Referenced by `MULTI_SPORT_ARCHITECTURE.md`, `DATA_MODEL.md`, and both ADRs.

## Stack

Next.js App Router + TypeScript, Tailwind, Supabase (Postgres + Auth + RLS), OpenAI for verdicts/roasts/debriefs/profiles, web-push for notifications, Vercel for hosting, GitHub Actions for sub-daily cron. No test suite exists yet.

## Framework, routing, server boundaries

- App Router under `src/app`. Server-only code (API tokens, service-role Supabase client) lives in `src/app/api/**/route.ts` and `src/lib/**`; nothing provider-sensitive is imported into client components today.
- `src/lib/supabase/admin.ts` builds a service-role client (RLS-exempt) used only server-side by the sync route and notification senders.
- Auth: Supabase magic link + email/password, `src/app/auth/**`.

## Data model — one implicit global competition

`supabase/schema.sql` is the single source of truth (migrations `0001`–`0003` are additive on top of it). Relevant tables:

- `teams` (line 18-25): `id, name, country_code, group_name, emoji_flag`. No competition/tournament dimension.
- `matches` (27-43): `id, external_match_id, home_team_id, away_team_id, kickoff_time, venue, stage, status, home_score, away_score, winner_team_id`. `stage` (34) is free text from the provider (`'Group stage'` default), not a structured enum — no competition FK.
- `predictions` (45-68): scoped to `user_id` + `match_id`, includes `predicted_winner_team_id` (52) for the penalty-advance pick, `share_token` (64) for `/r/[token]`.
- `public.leaderboard` view (144-156) and `public.league_leaderboard()` function (381-412): both `sum(points_awarded)` across **every** prediction a user has made, with no competition filter. Adding a second concurrent competition would blend its points into the same leaderboard today.
- `leagues` / `league_members` (282-465, private-leagues feature): membership rosters only, no competition scoping — a league implicitly competes over the single global leaderboard.

**Conclusion:** the schema has no `competitions` table and no `competition_id` anywhere. This is the primary gap for multi-competition support.

## Fixture sync — hardcoded to World Cup

- `src/lib/fixtures/football-data.ts:14-16` — `const COMPETITION = 'WC'; const SEASON = '2026';`, hardcoded constants, not env-driven.
- `buildWorldCupUpserts()` (line 130) — function name and implementation are WC-specific; fetches `/competitions/WC/teams?season=2026` and `/competitions/WC/matches?season=2026` directly (132-133).
- `STAGE_LABELS` (51-59) maps only WC stage codes (`GROUP_STAGE`, `LAST_32`, … `FINAL`). A league feed's `REGULAR_SEASON` stage would fall through to raw text (line 177) — a soft failure, not a crash, but wrong-looking copy.
- `FLAG_BY_AREA_CODE` (36-44) covers the 48 WC-qualified nations; irrelevant for club competitions (crests, not flags, would be needed).
- `src/app/api/admin/sync-fixtures/route.ts:3,50` imports and calls `buildWorldCupUpserts` directly — no competition parameter, no loop.
- Downgrade guard (route.ts 84-97): once a match is `final`, a stale upstream read can never revert it — this logic is competition-agnostic and reusable as-is.
- `.github/workflows/sync-fixtures.yml:9-35` — cron runs `*/30 * * 6,7 *` (June/July only) with an explicit `2026-06-11`→`2026-07-19` date-guard step; outside that window the workflow no-ops even though it still fires. This assumes one short, bounded tournament. A `vercel.json` daily cron exists as a Hobby-plan fallback, hitting the same endpoint.

## Scoring — mostly reusable, one real bug waiting

- `src/lib/scoring.ts` (`scorePrediction`) is pure and match-by-match — reusable as-is for a normal league season.
- **Bug:** `src/lib/utils.ts:63-65`:
  ```ts
  export function isKnockoutStage(stage: string): boolean {
    return stage !== 'Group stage';
  }
  ```
  Used in `PredictionForm.tsx:91` to force a penalty-winner pick whenever a predicted scoreline is level. Any league match (stage e.g. `'Regular Season'`, `'Matchday 3'`) is `!= 'Group stage'`, so this would incorrectly prompt penalty-winner picks on ordinary league draws — draws are a valid result in league football. **Must be fixed before any league competition ships** (see `DATA_MODEL.md` §Migration sequence — replace with an explicit `matches.is_knockout` boolean).

## Push notifications & cron — global queries, generalize for free

- `src/lib/notifications/send-result-notifications.ts` and `send-prediction-reminders.ts` both query `matches_with_teams` globally (`.eq('status', 'scheduled'|'final')`), no competition filter — this "just works" with more competitions added as more rows, though a mixed digest ("3 matches kick off soon") won't distinguish competitions in copy. Low-priority polish, not a blocker.
- Both are called from `sync-fixtures/route.ts:137-150`, wrapped so a delivery failure never fails the sync/settlement that already ran.

## Routing — no competition segment anywhere

- `/matches` (`src/app/matches/page.tsx`) lists all matches, unfiltered.
- `/matches/[id]` — dynamic segment is the match UUID only.
- `/leagues` — **FanBrain's own private prediction groups** (`leagues`/`league_members` table), unrelated to football competitions/leagues; naming collision to keep in mind once "competition" enters the vocabulary.
- `/p/[token]`, `/r/[token]` — opaque share tokens, no competition context.
- No `/c/[competitionSlug]` or `?competition=` pattern exists yet.

## Env / config

`.env.example`: `FOOTBALL_API_PROVIDER=football-data` (selector exists but only one provider implemented), single `FOOTBALL_DATA_API_TOKEN`, single `CRON_SECRET`. `SPORTMONKS_API_TOKEN` present but explicitly noted as unused legacy. No per-competition env vars exist; competition identity is 100% hardcoded in `football-data.ts`.

## Hardcoded "World Cup" UI copy (cosmetic only)

`src/app/page.tsx`, `leaderboard/page.tsx` + `leaderboard/og/route.tsx`, `leagues/page.tsx`, `InviteLink.tsx`, `CreateLeagueForm.tsx`, `YourRank.tsx`, `ShareProfileButton.tsx`, `opengraph-image.tsx`, `screenshots/{wide,narrow}/route.tsx`, `r/[token]/{page,og/route}.tsx`, `p/[token]/{page,og/route}.tsx`. None of these are structural blockers — they read wrong once a second competition ships, not before.

## Product-relevant detail not in the original brief

`src/lib/utils.ts:9-11` — code comment: *"All users (and the app owner) are in South Africa, so render kickoff times in SAST."* The userbase is South Africa-based. This directly informs the provider decision (see `PROVIDER_EVALUATION.md`): South African Premiership coverage is not a nice-to-have, it's close to the primary audience.

## Reuse assessment

| Reusable as-is | Needs generalizing |
|---|---|
| `scorePrediction` (scoring math) | `competitions` table + `competition_id` FK on `matches`/`teams` |
| Push subscription plumbing, VAPID config, reminder/digest delivery mechanics | `leaderboard` / `league_leaderboard()` — scope by competition |
| Private-leagues membership mechanics (`leagues`/`league_members`, SECURITY DEFINER fns) | `football-data.ts` — parameterize competition code + season, drop `buildWorldCupUpserts` naming |
| Auth/share-token routes (`/p/[token]`, `/r/[token]`) | `isKnockoutStage()` — replace stage-string inference with an explicit flag |
| Downgrade guard in sync route | Cron date-gating — must run year-round, not June/July only |
| Match card UI, prediction submission flow | UI copy — de-hardcode "World Cup" |
