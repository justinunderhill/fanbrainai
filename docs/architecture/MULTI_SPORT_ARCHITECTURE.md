# Multi-Sport Architecture

**Date:** 2026-07-25
**Scope:** the football-only architecture being built now, plus the seam left open for rugby/cricket/F1 later. See `docs/decisions/ADR-001-provider-neutral-sports-data.md` and `ADR-002-generic-event-and-prediction-model.md` for the reasoning behind what's built now vs. deferred.

## Domain boundary: provider data never reaches the frontend directly

```
Sports data provider (football-data.org, API-Football)
        ↓
Scheduled sync (GitHub Actions cron + Vercel Cron fallback → /api/admin/sync-fixtures)
        ↓
Provider adapter + normalization (src/lib/fixtures/*.ts)
        ↓
Supabase (competitions, teams, matches)
        ↓
Server routes / Supabase client queries (RLS-scoped)
        ↓
Frontend, prediction flow, settlement (scorePrediction)
```

This shape already exists for football-data.org — `football-data.ts` normalizes provider JSON into `TeamRow`/`MatchRow` before anything touches Supabase, and the frontend only ever reads `matches_with_teams` via the anon/authenticated Supabase client, never the provider directly. The expansion work is: (1) make the adapter layer support more than one provider/competition, (2) keep that same never-touch-provider-from-client boundary as competitions multiply.

## Provider adapter pattern (football-only version)

Each provider gets one adapter module exporting a function shaped like `buildWorldCupUpserts` is today, but parameterized:

```ts
// src/lib/fixtures/football-data.ts
export async function buildUpserts(token: string, competitionCode: string, season: string): Promise<{ teams: TeamRow[]; matches: MatchRow[] }>

// src/lib/fixtures/api-football.ts (new)
export async function buildUpserts(token: string, competitionCode: string, season: string): Promise<{ teams: TeamRow[]; matches: MatchRow[] }>
```

Both return the same `TeamRow`/`MatchRow` shape already defined in `football-data.ts` — that shape is the internal contract, not the brief's full `SportsDataProvider` interface (`getSports`, `getSeasons`, `getStandings`, etc.). A full multi-sport interface is deferred per ADR-002; building it now for a single sport with one active adapter would be speculative generality with no second implementation to validate it against.

`src/app/api/admin/sync-fixtures/route.ts` becomes a loop over `select * from competitions where is_active`, dispatching to the adapter named in each row's `provider` column, rather than a single hardcoded `buildWorldCupUpserts()` call.

## Synchronization design

- **Idempotent by construction**: teams use a deterministic UUID v5 derived from the provider's numeric id (`teamUuid()` in `football-data.ts`); matches upsert by `external_match_id`. This pattern carries over unchanged to new providers — API-Football's adapter derives its own UUID v5 namespace-keyed ids the same way, just keyed on `api-football:team:<id>` instead of `football-data:team:<id>` so the two providers' ids never collide even if they happen to share a numeric id space.
- **Forward-only results**: the existing downgrade guard (`route.ts:84-97` — never let a stale read revert an already-`final` match) is provider-agnostic and applies per-competition without change.
- **Scheduling**: the June/July date-guard in `.github/workflows/sync-fixtures.yml` is removed; the cron runs year-round. Per-competition cadence (e.g. poll PSL less frequently than a live PL matchday) is a future optimization, not needed for the initial football MVP — a single 30-min loop across all active competitions is well within both providers' free-tier rate limits at this scale.

## Failure and retry handling

- A single competition's provider failure must not block others — the sync loop catches per-competition and continues, returning a per-competition status in the response (extends the existing `{ teamsUpserted, matchesUpserted, ... }` response shape to an array, one entry per competition).
- Push notification sends already fail independently of the sync/settlement (`route.ts:134-150` wraps them in try/catch) — same pattern extends to per-competition sync failures.
- No retry-with-backoff exists today; not required at current request volume (well under both providers' free-tier rate limits), but worth adding once request volume grows past a single provider's per-minute cap.

## What's explicitly deferred (not built now)

- A `sports` table / sport-agnostic `sport_events` model — football is the only sport; adding this abstraction now would be built against a sample size of one.
- `prediction_market_types` / `scoring_rules` as data-driven config — today's scoring (`scorePrediction`, exact-score/outcome/draw) is hardcoded logic, which is fine while every competition is football with the same market shape (predict the score). Rugby's margin/tries markets and cricket's toss/runs/wickets markets are structurally different enough that designing the generic version now, before a second sport exists to validate the design against, risks building the wrong abstraction. Revisit when rugby actually enters scope (`PRODUCT_STRATEGY.md` phase 2).
- `settlement_runs` / `ingestion_runs` audit tables — not needed while there's one sync route and one settlement path to reason about directly from logs. Add when multiple competitions' settlement needs independent audit trails (e.g. a manual correction path per `FOOTBALL_MVP.md`'s admin requirements).

## Non-functional requirements carried forward from the original brief (still binding)

- No commercial API key reaches the browser bundle — already true, provider tokens are read only in `src/app/api/admin/sync-fixtures/route.ts` (server-only route) and passed to adapter functions, never exported to client code.
- Dates stored UTC, rendered in the user's timezone — already true (`kickoff_time timestamptz`, rendered via `formatKickoff()` in Africa/Johannesburg per `utils.ts:9-19`).
- Prediction deadlines enforced server-side — already true (`prevent_late_prediction` trigger, `schema.sql:180-198`), not just client-side.
- Synchronization idempotent — already true, extends unchanged (see above).
- RLS reviewed for every new table — `competitions` gets public-read RLS in `0004_competitions.sql`, matching the existing `teams`/`matches` pattern.
