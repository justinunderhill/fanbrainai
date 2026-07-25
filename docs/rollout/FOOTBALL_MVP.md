# Football MVP — Rollout

**Date:** 2026-07-25
**Scope:** Premier League, UEFA Champions League, South African Premiership. Builds on `docs/architecture/DATA_MODEL.md`'s additive migration and `docs/data-providers/PROVIDER_EVALUATION.md`'s hybrid football-data.org + API-Football decision.

## User stories

### Competition discovery
- As a fan, I can see which competitions FanBrain supports.
- As a fan, I can view current/upcoming rounds for a competition I care about.
- As a fan, I can filter `/matches` to one competition instead of seeing everything at once.

### Prediction flow (mostly unchanged — verify it still holds under real league data)
- As a fan, I can predict a match winner/draw/exact score before kickoff, same as today.
- As a fan, I can edit my prediction until the deadline (existing `prevent_late_prediction` trigger already enforces this server-side).
- As a fan, a league match that ends in a draw does **not** prompt me for a penalty-advance pick (this is the `isKnockoutStage()` fix — the acceptance criterion that proves the bug is actually fixed, not just documented).
- As a fan, a Champions League knockout leg that ends level **does** prompt me for a penalty-advance pick, same as World Cup knockouts did.

### League flow
- As a fan, I can create a private league scoped to one competition (e.g. "Office PSL league") or spanning all competitions (today's default behavior, preserved).
- As a fan, I can see a leaderboard that reflects only the competition(s) my league is scoped to.

### Engagement (reuse, not rebuild)
- Streaks, exact-score stats, share cards, push notifications all already exist and are competition-agnostic per `CURRENT_STATE_AUDIT.md` — verify they still read correctly once matches span competitions, don't rebuild them.

### Administration
- As an admin, I can see which competitions are active and when each last synced successfully (extend the existing sync response, don't build a new dashboard for v1 — the JSON response from `/api/admin/sync-fixtures` already reports counts; make it per-competition).
- As an admin, I can trigger a manual sync (already exists — `workflow_dispatch` / POST to the route).
- As an admin, I can correct an exceptional result via direct Supabase access (no in-app override UI for v1 — this exists implicitly today via the SQL editor; formalize only if it's needed more than rarely).

## Acceptance criteria

- [ ] `competitions` table exists with PL, Champions League, PSL, and the backfilled WC2026 rows.
- [ ] `/api/admin/sync-fixtures` syncs all active competitions, not just one hardcoded call.
- [ ] A league match ending in a draw never shows the penalty-advance prompt.
- [ ] A Champions League knockout match ending level still shows it.
- [ ] `/matches` can be filtered by competition.
- [ ] Global leaderboard behavior is unchanged when no competition filter is applied (World Cup history intact).
- [ ] A new private league can be scoped to a single competition.
- [ ] Cron runs year-round, not just June/July.
- [ ] "World Cup"-hardcoded copy that would now read wrong is updated (title, share cards, OG images — see `CURRENT_STATE_AUDIT.md`'s file list).

## Rollout stages

1. Apply `0004_competitions.sql` in staging/dev Supabase project first; verify existing World Cup data renders unchanged.
2. Ship the parameterized football-data.org adapter + updated sync route, still only syncing WC2026 (regression check — nothing should change for existing users yet).
3. Add Premier League + Champions League via football-data.org (same provider, just a new `competitions` row each) — lowest-risk new-competition test since no new provider is involved.
4. Add the API-Football adapter and South African Premiership behind it.
5. Ship the competition filter UI and league-scoping UI.
6. Remove the cron date-guard, confirmed once all of the above is stable.

## Explicitly out of scope for this release

Same exclusions as `docs/product/PRODUCT_STRATEGY.md`'s "Out of scope" section — no betting UX, no affiliate integrations, no live commentary, no rugby/cricket/F1 in this pass.
