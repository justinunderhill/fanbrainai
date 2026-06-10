# CLAUDEDEBUG.md — Senior dev review

**Date:** 2026-06-06
**Reviewer:** Claude (senior dev pass)
**Branch:** `main` (working tree has uncommitted auth/prediction changes)

## TL;DR

The build is **healthy at the tooling level** — `npm run typecheck` and `npm run lint` both pass clean. But the uncommitted changes are full of debugging scars (console logging, defensive fallback chains, a server→client gate migration) that all point at **one underlying architectural gap: there is no Next.js middleware to refresh Supabase auth sessions.** Everything Codex did in this diff is a symptom of fighting that, not a fix for it.

There are also two real **security/cost issues** (unauthenticated AI routes hitting the service-role client) that are more urgent than the auth UX work.

Priorities: **P0** = fix before anyone else uses it; **P1** = fix before "portfolio-grade"; **P2** = polish.

---

## P0 — Missing Supabase auth middleware (root cause of the auth saga) — ✅ FIXED 2026-06-06

**Resolution:** Added `src/proxy.ts` (Next 16's renamed `middleware` convention) backed by
`src/lib/supabase/middleware.ts` (`updateSession`). It runs `supabase.auth.getUser()` on every
matched request and writes the rotated cookies onto the response, so Server Components and route
handlers now read a fresh session. The proxy no-ops when Supabase env is absent (preserves the
`SetupNotice` path). Verified: `typecheck`, `lint`, and `next build` all pass.

Follow-ups still open (tracked under P0/P1 below): with server-side auth now reliable you can
delete the `authUser ?? sessionUser ?? auth.user` fallback in `PredictionForm.tsx`, drop the
`[auth]`/`[prediction auth]` console logging, and consider restoring the simpler server-side
gate in `matches/[id]/page.tsx`.

---

### Original finding (for context)

**Files:** no `src/middleware.ts` exists; `src/lib/supabase/server.ts:18-22`

`@supabase/ssr` requires a middleware that runs `supabase.auth.getUser()` on every request to refresh the auth token and write the rotated cookies back onto the response. This project doesn't have one. The server client even documents the consequence:

```ts
// src/lib/supabase/server.ts
setAll(cookiesToSet) {
  try { ... } catch {
    // Server Components cannot set cookies. Middleware can be added later if needed.
  }
}
```

"Later" is now. Without the middleware:

1. Access tokens are never refreshed server-side. A freshly signed-in user works, but ~1 hour later every **server-rendered** auth check silently sees no user.
2. Server Components can't persist rotated cookies, so the session drifts out of sync between server and client.

This is exactly what the diff is reacting to:

- `src/app/matches/[id]/page.tsx` — the server-side `auth.user ? <PredictionForm/> : <SignIn/>` gate was **ripped out** and replaced with a client-only `<PredictionAuthGate/>`. That's a workaround for the server not reliably seeing the session.
- `src/components/PredictionForm.tsx:75` — the defensive `const activeUser = authUser ?? sessionUser ?? auth.user;` triple-fallback is a band-aid for the same race/mismatch.
- The `console.info('[auth] ...')` / `console.info('[prediction auth] ...')` logging sprinkled across `auth/page.tsx`, `AuthProvider.tsx`, and `PredictionForm.tsx` is leftover instrumentation from chasing this.

**Still broken even after the workaround:** the pages that *kept* server-side auth will fail once the token needs refreshing:
- `src/app/profile/page.tsx:13` — `supabase.auth.getUser()` server-side → will show "sign in" to a logged-in user after token expiry.
- `src/app/api/ai/profile/route.ts:33` — gates on server `getUser()` → profile generation will 401 for a genuinely logged-in user.

**Fix:** add `src/middleware.ts` using the official `@supabase/ssr` pattern (create a server client bound to the request/response, call `getUser()`, return the response with refreshed cookies; matcher excludes static assets). Once that exists you can delete the client-side fallback chain and, ideally, restore the server-side gate.

---

## P0 — Unauthenticated AI routes burn OpenAI tokens via the service-role client — ✅ FIXED 2026-06-06

**Resolution:** `verdict`, `roast`, and `debrief` now require an authenticated session
(`createClient()` server client + `getUser()` → 401 if absent), matching the existing `profile`
route. `debrief` additionally verifies the prediction belongs to the caller (403 otherwise), since
it accepts an arbitrary `predictionId` and writes scoring data. Rate limiting is still a launch
TODO (see README) but the unauthenticated hole is closed.

---

### Original finding (for context)

**Files:** `src/app/api/ai/verdict/route.ts`, `src/app/api/ai/roast/route.ts` (and check `debrief`)

`verdict` and `roast` do **no auth check** and call `generateText()` (real OpenAI spend) and `createAdminClient()` (service-role, bypasses RLS). Anyone who finds the endpoint can POST arbitrary bodies in a loop and run up your OpenAI bill. There's no rate limiting either (the README lists rate limiting as a launch TODO, but *unauthenticated access* is the bigger hole).

Note the inconsistency: `src/app/api/ai/profile/route.ts:31-37` **does** gate on `getUser()` and ownership. The verdict/roast routes should do the same.

**Fix:** require an authenticated session in every AI route (mirror the `profile` route), and add basic per-user rate limiting before launch.

---

## P1 — Debug logging left in (PII + portfolio-grade violation) — ✅ FIXED 2026-06-06

**Resolution:** Removed all `[auth]` / `[prediction auth]` `console.info` calls from
`auth/page.tsx`, `AuthProvider.tsx`, and `PredictionForm.tsx`. Also removed the
`authUser ?? sessionUser ?? auth.user` fallback chain and the throwaway `getSession()` calls that
existed only to feed the logs — with the proxy keeping sessions fresh, `PredictionForm` now relies
on the `useAuth()` context user directly (it's already behind the loading/auth gate).

---

## P1 — Client-side persistence of AI verdict is silently best-effort

**File:** `src/components/PredictionForm.tsx:126-130`

After getting the verdict, the form writes it back with `.update({ ai_verdict })` from the browser and ignores the result. If RLS or the network drops it, the verdict shows once and is lost on reload, with no error surfaced. Acceptable for MVP, but worth either (a) checking the error, or (b) persisting verdict server-side inside the `/api/ai/verdict` route (it already has the admin client and the matchId — it could accept the prediction id and write it there).

---

## P2 — Smaller notes

- **`suppressHydrationWarning` on `<html>`** (`src/app/layout.tsx:13`) is a broad hammer. If it was added to silence an AuthProvider-related mismatch, confirm the actual cause rather than suppressing globally.
- **Browser client singleton** (`src/lib/supabase/browser.ts`) — good change; this is the right pattern and likely fixed a "multiple GoTrueClient instances" warning. Keep it.
- **Leaderboard semantics** (`supabase/schema.sql`, `leaderboard` view) — `correct_outcomes` counts `points_awarded >= 3`, which includes exact scores (5 pts). If you want "outcome-only correct" as a distinct stat, it's currently conflated. Cosmetic.
- **`score-final-matches`** recomputes and rewrites `points_awarded` for *every* final match on every run. Idempotent and correct, just does redundant writes — fine at MVP scale.
- **`.env.example` lists `NEXT_PUBLIC_APP_URL`** but the code derives origins from `window.location` / request URL instead. Harmless, just unused.
- **Line endings** — git reports LF→CRLF conversion on every touched file. Consider a `.gitattributes` with `* text=auto eol=lf` to keep diffs clean cross-platform.

---

## What's solid

- TypeScript is strict and passes; ESLint clean.
- Scoring (`src/lib/scoring.ts`) is deterministic and matches the documented rules (5/3/0). AI never awards points. ✅ per AGENTS.md.
- RLS is genuinely thought through: column-scoped `grant`s, `auth.uid()` checks, public read only on teams/matches/leaderboard, service-role kept server-side.
- DB-level guards are good: `prevent_late_prediction` trigger and `handle_new_user` trigger backstop the app logic.
- AI prompt layer is centralized in `src/lib/ai/prompts.ts` and `OPENAI_API_KEY` stays server-side. ✅

---

## Suggested order of work

1. Add `src/middleware.ts` (Supabase token refresh). **Root cause.**
2. Auth-gate `verdict` + `roast` routes. **Security/cost.**
3. Delete all `console.info` debug logging + the `authUser ?? sessionUser ?? auth.user` fallback.
4. Once 1–3 land, re-evaluate whether the client-only `PredictionAuthGate` is still needed or if the simpler server gate can return.

---

# Addendum — Post-result "return moment" loop

**Date:** 2026-06-10
**Branch:** `main` (commits `1777de3` feature, `7fbd8f0` README docs)
**Scope:** Enhancement **beyond the original MVP**. The MVP shipped silent background scoring and a
manual, per-pick "Get AI debrief" button on *My Picks*. This surfaces the payoff automatically when a
fan returns after matches settle. Product docs live in `README.md` → "Post-result recap".

## What shipped

- **`src/components/ResultsRecap.tsx`** (client) — mounted at the top of `src/app/page.tsx`. Greets a
  returning fan with points banked this round + one row per newly-settled pick (final score vs. their
  call + points badge). Renders nothing when there's nothing new.
- **Inline lazy AI debrief** — for newly-settled picks without a debrief, calls the existing
  `POST /api/ai/debrief` **sequentially** (one at a time) to respect that route's 6/min per-user
  limiter; renders text as it arrives, with a manual-button fallback link on failure. After
  generating it `router.refresh()`es so server components pick up the persisted debrief/points.
- **`src/components/YourRank.tsx`** (client) — mounted in `src/app/leaderboard/page.tsx`. "You're #N ·
  ↑/↓ since you last checked" banner.
- **Exact-score confetti** — CSS-only, no dependency (`confetti` keyframe in `tailwind.config.ts`).
- **`src/lib/recap-store.ts`** — localStorage anchor for "seen pick ids" + "last rank", exposed as a
  `useSyncExternalStore` source. **Shared `pointsBadge`** extracted from `PredictionRow` to
  `src/lib/scoring.ts`.

## Tooling

`typecheck`, `lint`, and `next build` all pass clean.

## Review notes / known tradeoffs (none blocking)

- **Zero-DDL by design (P2 / accepted):** "since last seen" is client-side localStorage, so seen/rank
  state is **per-device** and not synced across a user's devices. Deliberate — ships with no Supabase
  migration and suits the friends/family audience. Upgrade path documented: add
  `users.last_recap_seen_at` and move read/write server-side.
- **`useSyncExternalStore` instead of an effect (rationale):** Next 16's `react-hooks/set-state-in-effect`
  rule forbids the "read localStorage in `useEffect` → `setState`" pattern. The store reads through
  `useSyncExternalStore` so components derive state during render. `getServerSnapshot` returns an empty
  state, so the recap/banner are intentionally absent during SSR + initial hydration, then appear once
  the client snapshot resolves (no hydration mismatch).
- **`YourRank` delta is first-paint (P2 / cosmetic):** the up/down delta is computed against the stored
  `lastRank`, then the effect overwrites `lastRank` to the current rank. On a subsequent client
  re-render the delta collapses to "holding steady." Fine for this server-rendered page (no client
  interactivity to trigger re-renders); worth knowing if that page gains client state later.
- **Rank derivation does a full leaderboard scan (P2 / scale):** both `getRecap()` (home) and the
  leaderboard page fetch the full ordered `leaderboard` view and `findIndex` the user to get true rank
  (so it's correct outside the top 50). Fine at friends/family scale; if the user base grows, replace
  with a count query (`count(*) where total_points > mine`).
- **Lazy debrief cost (by request):** debriefs generate only on view (chosen over auto-at-settle), so
  no OpenAI spend for fans who never return. A fan returning to many newly-settled picks at once could
  approach the 6/min limiter; the sequential loop + per-pick fallback link handle that gracefully.
- **Unverifiable pre-kickoff:** with no settled picks before the 2026-06-11 kickoff, the loop couldn't
  be eyeballed locally; it only renders once real results settle. Verification deferred to real
  fixtures.
