# ADR-001: Provider-neutral sports data layer

**Date:** 2026-07-25
**Status:** Accepted

## Context

FanBrain is expanding from one hardcoded provider/competition (football-data.org, World Cup 2026 only — `src/lib/fixtures/football-data.ts`) to multiple competitions, and per `docs/data-providers/PROVIDER_EVALUATION.md`, at least two providers (football-data.org for PL/CL, API-Football for South African Premiership, since football-data.org's free tier doesn't cover PSL).

## Decision

The frontend and prediction/settlement logic never call a commercial sports API directly, and never see provider-specific ids, field names, or status codes. All provider data passes through a per-provider adapter (`src/lib/fixtures/<provider>.ts`) that normalizes into FanBrain's own `TeamRow`/`MatchRow` shape before it reaches Supabase. Provider identity is stored as data (`competitions.provider`, `competitions.provider_code`), not code branches scattered through the app.

This pattern already existed implicitly for football-data.org (the adapter never leaked football-data's raw JSON shape past `football-data.ts`); this decision makes it explicit and extends it to be provider-count-agnostic.

## Consequences

- Adding a provider means writing one new adapter file, not touching `sync-fixtures/route.ts`'s core logic or any frontend code.
- Provider API tokens stay server-side (`FOOTBALL_DATA_API_TOKEN`, and a new `API_FOOTBALL_TOKEN`), read only inside `src/app/api/admin/sync-fixtures/route.ts` and passed into adapter functions — never exported to a client bundle.
- If a provider is dropped or replaced, only its adapter file and the `competitions.provider` values pointing at it change; `matches`, `predictions`, scoring, and the frontend are untouched.
- Historical data survives a provider switch — `matches.external_match_id` and `competitions.provider_code` record where data came from, but nothing downstream depends on a specific provider's ids staying stable.

## Not decided here

Which specific providers to use long-term for rugby/cricket/F1 (API-Sports Rugby, Sportmonks Cricket, OpenF1) — those are named as directional candidates in `docs/product/PRODUCT_STRATEGY.md` but not committed; each gets its own evaluation when that sport actually enters scope.
