# Product Strategy

**Date:** 2026-07-25
**Status:** Post-World Cup expansion. Supersedes the "MVP scope" section of `AGENTS.md` (kept there for history; this doc is the current source of truth for direction).

## Positioning

> FanBrain is a social sports prediction and fan-engagement platform, not a live-score service.

Live scores and fixture data are supporting infrastructure. The differentiator — and the thing the World Cup run validated — is the loop:

1. Follow a competition or team.
2. Make a prediction before deadline.
3. Compete in public or private leagues.
4. Earn points, streaks, and share the result.
5. Return for the next round.

Do not let this drift into "another scores app." Every feature decision should ask which step of that loop it strengthens.

## What the World Cup run proved

- The core predict → score → leaderboard loop works and holds attention (per `fanbrain-status` history: MVP loop live, share loop, push notifications, PWA install, private leagues, penalty-shootout picks all shipped and used).
- Fans want social proof (share cards, streaks, rank movement) as much as the prediction itself.
- The userbase is South Africa-based — this shapes both competition choice (South African Premiership matters, not just European leagues) and infra (kickoff times already render in SAST).

## Target audience

South Africa-based football fans who want a lightweight, social, WhatsApp-shareable prediction game — not bettors, not stats obsessives. Same audience the World Cup product already reached; expansion should deepen engagement with them, not chase a different demographic first.

## Expansion order

Do not add several sports at once.

1. **Year-round football competitions** (current phase).
2. Rugby.
3. Cricket.
4. Formula 1.

First commercial release:

> **FanBrain Football** — Premier League, UEFA Champions League, and South African Premiership predictions, with private leagues and season-long leaderboards.

Football is first because the existing prediction experience, match model, and scoring mechanics are already football-shaped — see `docs/architecture/CURRENT_STATE_AUDIT.md` for exactly what's reusable.

### Later phases (unchanged from original brief, tracked for context — not scoped now)

- **Rugby**: United Rugby Championship, Rugby Championship, Springbok internationals, Six Nations, Rugby World Cup. Prediction markets beyond winner/score: winning margin, total tries, first try scorer (where player data is reliable).
- **Cricket**: Proteas internationals, SA20, IPL, ICC tournaments. Markets: winner, toss winner, top run scorer, top wicket taker, team total range, powerplay score range. Cricket should wait until the platform actually supports sport-specific event structures and scoring rules — see `docs/decisions/ADR-002-generic-event-and-prediction-model.md` for why that generalization is deliberately deferred, not skipped.
- **Formula 1**: pole position, race winner, podium, fastest lap, driver head-to-head, safety car occurrence, constructor points. Modeled as a distinct experience — race weekends don't fit the fixture/match shape at all.

## Monetisation hypotheses (not committed — validate before building)

- Free public predictions, paid private-league features (custom branding, extra members, historical stats).
- Premium analytics / streak history / advanced stats.
- Sponsored leagues and brand campaigns.
- Club, supporter-group, or corporate prediction competitions.
- White-label competition experiences.
- Ad-free membership.

Do not build billing because a model is listed here. Validate retention and willingness to pay first — the loop has to hold for a full football season before monetisation questions are worth answering.

## Out of scope for the football release

- Real-money betting or wagering (also prohibited by `AGENTS.md`'s "no betting UX" rule — that rule still applies).
- Bookmaker affiliate integrations.
- Live minute-by-minute commentary.
- AI match predictions presented as guaranteed outcomes.
- Simultaneous football + rugby + cricket + F1 launch.
- Enterprise data-provider contracts (Sportradar-class) — premature at current scale.
- Native mobile apps.
- Complex subscription billing before engagement is validated.
