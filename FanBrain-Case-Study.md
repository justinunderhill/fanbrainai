# FanBrain AI — Case Study

**An AI-native football engagement app, taken from blank repo to live product.**

🔗 Live: [fanbrainai.com](https://fanbrainai.com) · Built with Next.js, TypeScript, Supabase, OpenAI, deployed on Vercel

---

## TL;DR

FanBrain AI is a mobile-first prediction game for the 2026 World Cup. Fans call scorelines before kickoff, get an AI football pundit's verdict (and an optional roast), earn points when the real result lands, climb a leaderboard, compete in private leagues with friends, and unlock a shareable "fan personality" profile generated from how they actually predict.

I designed, built, and shipped the entire product solo — product thinking, data model, AI system, full-stack app, auth and security, background jobs, push notifications, PWA, and the viral share loop — and ran it as a live, continuously-deployed service. It's a deliberate demonstration of the skill set a **Forward Deployed Engineer** needs: turning an ambiguous goal into a working product, integrating AI responsibly, and owning every layer from Postgres row-level security to the share card a user screenshots into their group chat.

---

## The problem & the product thesis

Big tournaments generate enormous fan energy, but most of that energy has nowhere to go that isn't gambling. I wanted to build the opposite of a betting product: a **prediction game for entertainment** where the AI does something genuinely useful — it *interprets, explains, classifies, and entertains* — rather than being a chatbot bolted onto a CRUD app.

That framing drove a single hard architectural principle that shows up everywhere in the codebase:

> **The AI is never the source of truth. Structured facts come from the database; AI is commentary layered on top.**

Match data is imported from a real fixtures API. Points are awarded by deterministic, testable code. The AI is explicitly forbidden from inventing scores, fixtures, injuries, or odds. This separation is what makes the product *trustworthy* and *demoable* — exactly the property you need when you're putting an LLM in front of real users.

---

## What I built

| Capability | What it does |
|---|---|
| **Predictions** | Submit a scoreline + a "prediction style" (head / heart / chaos / underdog / tactical / vibes) before kickoff. Locked at kickoff at the database level. |
| **AI Verdict** | A hyped-up pundit reacts to your call in 40–80 words. |
| **AI Roast** | Optional cheeky takedown of the *pick* (never the person), with safety guardrails. |
| **AI Debrief** | Post-match analysis comparing prediction to reality, with an A+–F grade. |
| **Fan Personality Profile** | Classifies you into one of seven archetypes (The Chaos Analyst, The Underdog Prophet, …) with logic/chaos/loyalty/risk scores — derived purely from prediction behaviour. |
| **Scoring & leaderboard** | +5 exact score, +3 right result, deterministic, idempotent. Global leaderboard + streak tracking. |
| **Private leagues** | Create/join a league by invite code, members-only leaderboard, ownership transfer, leave/delete. |
| **Viral share loop** | Public share pages + dynamically-rendered Open Graph images for profiles, individual predictions, and leaderboard rank. |
| **Push notifications** | Opt-in web push for "your result is in" and deadline reminders, batched through a scheduled job. |
| **PWA** | Installable, offline-aware, with install prompts and update toasts. |

---

## Architecture

```
                 ┌───────────────────────────────────────────────┐
                 │  Next.js App Router (TypeScript, Tailwind)     │
                 │  - Server components for data + auth           │
                 │  - Server route handlers for every AI call     │
                 │  - PWA service worker (Serwist)                │
                 └───────────────┬───────────────────────────────┘
                                 │
          ┌──────────────────────┼───────────────────────────┐
          │                      │                            │
   ┌──────▼───────┐      ┌───────▼────────┐          ┌────────▼─────────┐
   │  Supabase    │      │   OpenAI API   │          │ football-data.org │
   │  Postgres    │      │ (gpt-4.1-mini) │          │  fixtures/results │
   │  + Auth      │      │  server-side   │          └────────┬─────────┘
   │  + RLS       │      │  only          │                   │
   └──────┬───────┘      └────────────────┘                   │
          │                                                    │
          │        ┌──────────────────────────────────────────▼──┐
          └────────┤  Vercel Cron → /api/admin/sync-fixtures      │
                   │  - imports fixtures + results (idempotent)   │
                   │  - settles points deterministically          │
                   │  - fires result + deadline push (batched)    │
                   └──────────────────────────────────────────────┘
```

**Stack:** Next.js App Router · TypeScript (strict) · Tailwind · Supabase (Postgres, Auth, RLS) · OpenAI · `web-push` · Serwist PWA · Vercel (hosting + cron) · continuous deploy on `main`.

---

## Engineering deep-dives

These are the parts I'm proudest of — each one is a decision where I traded the easy path for the correct one.

### 1. Security designed at the database layer, not the app layer

Authorization lives in Postgres, not in hand-written `if` checks scattered through route handlers. Every table has **row-level security** enabled, and the grants are deliberately narrow:

- Users can only read/write **their own** predictions and profile (`auth.uid() = user_id` policies).
- Sensitive operations that *can't* be expressed as a simple row policy run through **`SECURITY DEFINER` functions** — e.g. private leagues. A non-member needs to be able to insert their own membership row when joining by invite, but you don't want a blanket insert grant. So joining, creating, ownership transfer, and the members-only leaderboard all route through definer functions with explicit checks inside them. There is intentionally *no* direct insert policy on `league_members`.
- The `is_league_member()` membership check is itself a definer function, so the RLS policy that uses it can't recurse into itself — a subtle trap I designed around up front.
- Share tokens are unguessable UUIDs read **only** via the service-role admin client server-side; no anon grant is ever added to those tables, so a public share page can't be turned into a data-exfiltration endpoint.
- Prediction lock-out is enforced by a **`BEFORE` trigger** (`prevent_late_prediction`), not client-side validation — you physically cannot write a prediction after kickoff, no matter what request you craft.

This is the mindset I'd bring to a customer environment: *make the wrong thing impossible at the lowest layer, not merely discouraged at the highest.*

### 2. Deterministic scoring, generative commentary — strictly separated

`scorePrediction()` is ~10 lines of pure, testable logic: exact score → 5, right outcome → 3, else 0. **The AI never awards points.** It only ever produces text. This separation means scoring is auditable and reproducible, while the LLM is free to be creative without ever being load-bearing for correctness. It's the single most important design decision in the product.

### 3. Prompt engineering as a guardrail surface

All prompts live in one file (`src/lib/ai/prompts.ts`), never scattered across components, so the safety rules are reviewable in one place. Each prompt:

- Pins the persona and the word budget (verdicts 40–80, roasts 20–45, debriefs 60–100).
- **Hard-codes the prohibitions** inline: no betting/odds/gambling language, no fabricated team news or match events, no claims of certainty. The roast prompt explicitly instructs the model to "roast the *pick*, not the person — no profanity, no slurs, no protected-class insults."
- The personality classifier returns **structured JSON** (`personality_type`, four 0–100 scores, summary) and is told to use *only* prediction behaviour, never sensitive personal traits.

The product principle "AI-first, not AI-for-show" is enforced in the prompts themselves — the constraints are part of the contract, not an afterthought.

### 4. An idempotent background job that does four things safely

A single Vercel Cron endpoint (`/api/admin/sync-fixtures`) runs on a schedule and:

1. Imports fixtures + results from football-data.org (upsert on a stable external ID — safe to re-run).
2. Settles points for newly-final matches — but only writes when the computed points actually *differ* from what's stored, so re-runs are no-ops.
3. Sends "your result is in" push notifications, guarded by a `result_notified_at` idempotency column so a re-run never double-notifies.
4. Sends deadline reminders, guarded by a `prediction_reminders` log table keyed on `(user, match)`.

Crucially, the notification steps are **wrapped in try/catch** so a push-delivery hiccup can never fail the sync that already settled the points. The endpoint is auth'd with a `CRON_SECRET` and accepts both GET (Vercel Cron) and POST (manual runs). This is production-grade job design: idempotent, partially-degradable, and re-runnable without fear.

### 5. The viral loop: dynamic Open Graph image generation

Growth was a first-class feature, not an afterthought. Every shareable artifact — your fan profile, an individual prediction, your leaderboard rank — has a public token-gated page **and** a server-rendered Open Graph image generated on the fly with Next's `ImageResponse`. When a user drops the link in a group chat, it unfurls into a rich, branded card built from their real data. (I also debugged and documented a real gotcha here: `ImageResponse` routes need `connection()` or they 404 under `next start` — the kind of sharp edge you only learn by shipping.)

### 6. Pragmatic, honestly-documented trade-offs

The in-memory rate limiter is my favourite example of engineering judgement over dogma. It's a sliding-window limiter that lives in process memory — and I documented *exactly* what that means in serverless: it's per-instance, not a strict global guarantee, so it reliably blunts naive request loops but isn't a hard cross-region cap. The comment even names the upgrade path (back it with Upstash/Vercel KV; call sites won't change). Shipping the right-sized solution *and* being honest about its limits is precisely the judgement an FDE needs when building under time pressure in a customer's environment.

---

## Why this maps to Forward Deployed Engineering

FDE work is about dropping into an ambiguous problem, working backwards from what a user actually needs, and personally owning the path from idea to a thing people use. FanBrain is that pattern in miniature:

- **Ambiguity → product.** I started from a one-line ambition ("AI football engagement for the World Cup") and made every product call myself: the no-betting positioning, the seven personality archetypes, the points scheme, the retention mechanics (streaks, leagues, push).
- **AI integration done responsibly.** I treated the LLM as a component with a contract and guardrails, kept it strictly non-load-bearing for correctness, and designed the fact/commentary boundary that makes it safe to demo to real users.
- **Full-stack ownership.** Data modelling, RLS, auth, background jobs, push infrastructure, PWA, and front-end polish — no layer handed off.
- **Ship, observe, iterate.** It's continuously deployed and live; features (leagues, push, share loop, PWA) were layered onto a working core loop rather than big-banged. I deploy to `main` and check the running product, not just the test suite.
- **Communicates the work.** The codebase is heavily commented with *why*, not just *what* — the same skill as walking a customer stakeholder through a solution.

---

## Selected technical highlights at a glance

- **TypeScript strict** end to end; shared domain types in one module.
- **Postgres views** (`matches_with_teams`, `leaderboard`) to keep the API surface clean and the read paths fast.
- **Auto-provisioned user rows** via a `handle_new_user` trigger on `auth.users`, with a generated unique username.
- **Web push** with VAPID keys, multi-device subscription storage, and dead-subscription cleanup.
- **Offline-aware PWA** via Serwist with conservative caching, install prompts, and update toasts.
- **GitHub-token-via-credential-manager** deploy workflow and env-var-driven custom domain configuration.

---

## What I'd build next

- Back the rate limiter with a shared store (Upstash) to make it a strict global cap.
- A lightweight test harness around the scoring + streak logic (already pure functions, built to be tested).
- AI match previews and team-form context fed *as structured input* (preserving the no-fabrication rule).
- Server-side analytics on the share loop to measure k-factor and tune the OG cards.

---

*FanBrain AI was designed and built solo as a portfolio project. It is not affiliated with FIFA and is not a gambling product.*
