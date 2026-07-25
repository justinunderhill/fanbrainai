# Provider Evaluation

**Date:** 2026-07-25
**Decision needed:** which football data provider(s) power the multi-competition expansion.

## Why this isn't a simple swap

FanBrain is currently live on **football-data.org** (free tier), integrated in `src/lib/fixtures/football-data.ts`, proven through the full World Cup run. Per `CURRENT_STATE_AUDIT.md`, the userbase is South Africa-based (`src/lib/utils.ts:9-11`), and Phase 1 of the roadmap explicitly wants **South African Premiership** coverage alongside Premier League and Champions League. That single requirement changes the answer from "which provider" to "which provider for which competition."

## Coverage findings

| Competition | football-data.org free tier | API-Football |
|---|---|---|
| FIFA World Cup | ✅ (already integrated) | ✅ |
| Premier League | ✅ | ✅ |
| UEFA Champions League | ✅ | ✅ |
| South African Premiership | ❌ — free tier's 12 competitions are World Cup, Euros, Champions League, and Europe's top domestic leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, Championship) plus Brazilian Serie A. PSL is not among them. | ✅ — API-Football publishes South Africa league coverage directly ([api-football.com/news/post/south-africa-leagues](https://www.api-football.com/news/post/south-africa-leagues)); as a global provider (900+ leagues) it covers PSL fixtures/results. |

Sources: [football-data.org coverage](https://www.football-data.org/coverage), [football-data.org API policies](https://docs.football-data.org/general/v4/policies.html), [API-Football pricing](https://www.api-football.com/pricing), [API-Football South Africa leagues](https://www.api-football.com/news/post/south-africa-leagues).

## Pricing (API-Football / api-sports.io)

| Plan | Price | Requests/day | Requests/min |
|---|---|---|---|
| Free | $0 | 100/day (unauthenticated tier is much lower than paid; verify exact free-tier cap at signup — public docs are inconsistent between "free" and "Pro" figures) | 10/min |
| Pro | $19/mo | 7,500/day | 300/min |
| Ultra | $29/mo | 75,000/day | 450/min |
| Mega | $39/mo | 150,000/day | 900/min |

football-data.org free tier: 10 requests/minute, unlimited requests/day, current-season data only, scores delayed (not real-time — irrelevant for a ~30-min poll cadence FanBrain already uses).

**Note:** the exact API-Football free-tier daily cap returned inconsistent numbers across sources during this evaluation (see pricing table). Before committing spend, re-verify directly at api-football.com/pricing (blocked automated fetch during this evaluation — 403) and confirm against the checklist in §Licensing checklist below.

## Recommendation

Hybrid, not a replacement:

- **Keep football-data.org** for Premier League, Champions League, World Cup/Euros — already integrated, free, proven, zero migration cost.
- **Add API-Football** as a second adapter, scoped initially to South African Premiership only, since it's the one competition football-data.org can't serve.
- Build the sync layer so a competition's provider is configuration, not code (`competitions.provider` + `competitions.provider_competition_id`, per `DATA_MODEL.md`) — this is what ADR-001 requires anyway, and it's what makes "which provider serves PSL" a data question instead of a rewrite.

This keeps cost at $0 for the initial football expansion (API-Football's free plan is enough to validate PSL demand before paying for higher request volume) while satisfying the brief's coverage requirement.

## Licensing / commercial-use checklist (unresolved — verify before paid signup)

- [ ] Confirm South African Premiership fixtures are in-scope for the free plan (not premium-only).
- [ ] Confirm derived prediction scores/leaderboards may be stored permanently (both providers — check ToS, not just pricing page).
- [ ] Confirm team crest/logo display rights (FanBrain doesn't currently render logos; if that changes, this needs re-checking).
- [ ] Confirm attribution requirements for both providers.
- [ ] Separate production vs. development API keys once a paid plan is used.
- [ ] Re-verify football-data.org's free-tier commercial-use terms haven't changed since original WC2026 integration.

## Deferred

Rugby (API-Sports Rugby), Cricket (Sportmonks Cricket), Formula 1 (OpenF1) are out of scope for this evaluation — revisit per `PRODUCT_STRATEGY.md`'s phased order once football is stable.
