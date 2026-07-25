# ADR-002: Defer the generic sport/event/prediction-market model

**Date:** 2026-07-25
**Status:** Accepted (scope-narrowing decision — revisit when rugby enters scope)

## Context

The original expansion brief (`FanBrain_Multi_Sport_Expansion_Implementation_Brief.md`, §8) specs a fully generic domain model: `sports`, `sport_events`, `event_participants`, `prediction_market_types`, `prediction_options`, `scoring_rules`, `settlement_runs`, etc. — built so football, rugby, cricket, and Formula 1 all fit through the same tables from day one.

The near-term goal (`docs/product/PRODUCT_STRATEGY.md`) is football-only: Premier League, Champions League, South African Premiership. Every one of those competitions has the same prediction shape FanBrain already supports (predict a score; draw is a valid result; some matches are knockout ties needing a penalty-advance pick).

## Decision

Build the narrower model now: a `competitions` table and `matches.competition_id`/`matches.is_knockout` (see `docs/architecture/DATA_MODEL.md`), not the full generic sport/event/market/settlement schema. Keep `scorePrediction` as hardcoded logic rather than data-driven `scoring_rules`.

## Rationale

Rugby's markets (winning margin, total tries, first try scorer) and cricket's (toss winner, top run scorer, team total range, powerplay score range) are structurally unlike "predict a score" — designing a generic `prediction_market_types`/`scoring_rules` engine now means designing it against zero real non-football examples. That's the textbook shape of an abstraction built too early: it optimizes for a future need we can't yet see clearly, at the cost of real complexity (settlement engine, market-type registry, generic UI for markets that don't exist yet) that slows down the one thing currently in scope — shipping football competitions fans will actually use.

The football-only version is not a dead end: `competitions` and `matches.competition_id` are exactly the tables a generic model would need too, so nothing here gets thrown away. What's deferred is the market/settlement abstraction layer specifically.

## Consequences

- Shipping football is faster and the schema stays legible for a single-sport codebase.
- When rugby enters scope (`PRODUCT_STRATEGY.md` phase 2), this ADR should be revisited: at that point there are two real market shapes to design the generic model against instead of one imagined shape, which produces a better abstraction.
- Risk: if rugby is added carelessly on top of the football-only schema without first generalizing, it could bolt on rugby-specific columns to `matches`/`predictions` the way World Cup specifics were originally baked in — a smaller version of the same mistake this expansion is fixing. Mitigation: when rugby scoping starts, revisit this ADR explicitly before writing any rugby migration, rather than extending the football schema in place.
