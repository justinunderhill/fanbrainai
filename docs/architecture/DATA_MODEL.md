# Data Model — Current & Target

**Date:** 2026-07-25
**Scope decision:** per `docs/decisions/ADR-002-generic-event-and-prediction-model.md`, this is the **football-only** target model (add competitions, not a full multi-sport markets engine). Revisit when rugby/cricket actually enter scope.

## Current schema

See `docs/architecture/CURRENT_STATE_AUDIT.md` §Data model for the full breakdown. Summary: `teams` and `matches` have no competition dimension; `leaderboard`/`league_leaderboard()` aggregate every prediction a user has ever made with no way to scope by competition.

## Target schema (additive)

```
competitions
  id              uuid pk
  code            text unique      -- FanBrain's own code, e.g. 'WC2026', 'PL', 'CL', 'PSL'
  name            text             -- 'Premier League'
  season          text             -- '2026', '2026-27'
  provider        text             -- 'football-data' | 'api-football'
  provider_code   text             -- the id/code that provider uses for this competition
  is_active       boolean default true
  created_at      timestamptz

matches
  + competition_id  uuid not null references competitions(id)
  + is_knockout     boolean not null default false   -- replaces isKnockoutStage() string-matching

leagues (FanBrain's own private-league feature — unrelated naming collision, see note below)
  + competition_id  uuid null references competitions(id)   -- null = spans all competitions
```

`teams` is deliberately **not** given a `competition_id` — the same team (e.g. Manchester City) plays in multiple competitions (Premier League and Champions League) simultaneously. Team identity stays global; `matches.competition_id` is where the scoping lives.

### Naming collision to be aware of

FanBrain already has a `leagues` table — that's the *private prediction groups* feature (friends competing on a members-only board), unrelated to football leagues/competitions. Football competitions are called `competitions` in this schema specifically to avoid colliding with that existing concept. Don't rename `leagues` — it's live, shared via invite links, and renaming would break existing invite/share flows for no benefit.

### Leaderboard scoping

`public.leaderboard` and `public.league_leaderboard()` currently aggregate unconditionally. Target: both take an optional `p_competition_id`. When null, behave as today (all-time, all-competitions — this is what preserves World Cup leaderboard history unchanged). When set, scope to predictions on matches in that competition. Implementation: join `predictions -> matches` on `competition_id` inside the function/view rather than adding `competition_id` to `predictions` directly (predictions don't need to duplicate what's derivable from their match).

### `is_knockout` instead of `isKnockoutStage()`

Set explicitly at sync time from the provider's stage code (e.g. football-data's `LAST_16`/`QUARTER_FINALS`/etc. → `true`, `GROUP_STAGE` → `false`; a league's `REGULAR_SEASON` → `false`). This is the fix for the bug documented in `CURRENT_STATE_AUDIT.md` — a league match will never be misidentified as a knockout tie just because its stage string isn't literally `'Group stage'`.

## Migration sequence (additive, non-destructive)

1. **`0004_competitions.sql`** — create `competitions` table; add `matches.competition_id` (nullable first) and `matches.is_knockout`; backfill: insert one `competitions` row for `WC2026`, set `matches.competition_id` to it for all existing rows, backfill `is_knockout = (stage <> 'Group stage')`; then set `competition_id` `not null`. Add `leagues.competition_id` (nullable, defaults to null = all competitions). This migration is self-contained and non-breaking on its own — it does not touch `leaderboard`/`league_leaderboard()`. A separate migration converts those to competition-scoped functions when the competition-filter UI ships (step 5 below / `FOOTBALL_MVP.md` rollout stage 5), since that change requires updating `src/app/leaderboard/page.tsx` in the same deploy (a view can be queried with `.from()`; a function needs `.rpc()`).
2. **Sync layer** — parameterize `football-data.ts` (competition code + season instead of hardcoded constants), add the API-Football adapter behind the same shape, make the sync route loop over `competitions where is_active`.
3. **Cron** — drop the June/July date-guard in `.github/workflows/sync-fixtures.yml`; run year-round.
4. **Fix `isKnockoutStage()`** — replace its call site in `PredictionForm.tsx` with `match.is_knockout` from the synced data; keep the old function only if still referenced elsewhere, otherwise delete it (don't leave a dead, misleading helper around).
5. **UI** — add a competition switcher (`?competition=` query param is enough for v1, no need for a full `/c/[slug]` route restructure yet), de-hardcode "World Cup" copy where it would now be misleading.

Existing World Cup data is never deleted or renamed — it becomes `competition_id = <WC2026 row>` like everything else. The World Cup leaderboard/share history stays queryable exactly as it renders today.

## Draft migration file

`supabase/migrations/0004_competitions.sql` has been added to the repo as a draft (see file) reflecting steps 1 above. **It has not been applied to production.** Review it, then apply via the Supabase SQL editor the same way `0001`–`0003` were applied (per `README.md`'s Supabase setup section) when ready to start the football expansion build.
