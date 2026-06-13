# Shareable Fan Profile — Social Share Loop (Parked Plan)

> Status: **Parked / not started.** Decision made, implementation deferred. Revisit later.
> Recommendation: build the personalized share loop scoped to the **fan profile**.

## Context

FanBrain generates two genuinely novel, screenshot-worthy artifacts: AI verdicts on
picks and an AI **fan-personality profile** (personality type + Logic/Chaos/Loyalty/Risk
scores). For a free consumer product riding the World Cup, a social share loop is the
natural growth engine — and the content already exists, so we're only adding distribution.

The decision (after weighing scope) is to build the **industry-standard share pattern**:
a personalized visual card behind an **unlisted share link**, with a matching link-preview
(Open Graph) image so the link unfurls into the actual personality on X/iMessage/WhatsApp.
The **fan profile** is the hero artifact. "Share buttons only" and "generic preview" were
rejected as half-measures — the loop converts because a friend who clicks the link sees the
real personality.

Privacy/safety is handled the conventional way: an **unguessable `share_token`** (unlisted,
not enumerable) read server-side through the existing **service-role admin client**, so the
owner-only RLS policies stay completely intact. No `anon` grant is added to `fan_profiles`.

## Current-state facts (verified)

- `fan_profiles` (supabase/schema.sql:64) is keyed by `user_id`; columns: `personality_type`,
  `logic_score`, `chaos_score`, `loyalty_score`, `risk_score`, `summary`, `updated_at`.
- RLS locks `fan_profiles` and `predictions` to the owner; `anon` has **no** grant on them.
  `teams`/`matches`/`matches_with_teams`/`leaderboard` are public. The leaderboard already
  publicly exposes `display_name` — so exposing display_name on a share page is consistent.
- `createAdminClient()` (src/lib/supabase/admin.ts) bypasses RLS via service role; already
  used by API routes. This is the read path for the public share page.
- No OG/metadata infra exists today (src/app/layout.tsx has only static title/description).
  Next App Router supports `ImageResponse` / `opengraph-image` natively on Vercel.
- Profile UI lives in src/app/profile/page.tsx; the `Metric` bar component is defined inline
  there and should be extracted for reuse on the public page.

## Approach (recommended — scoped to the fan profile)

### 1. Additive migration (safe, no policy changes)
Add to `fan_profiles`:
```sql
alter table public.fan_profiles
  add column share_token uuid not null default gen_random_uuid();
create unique index fan_profiles_share_token_key on public.fan_profiles(share_token);
```
- Defaulted column backfills existing rows automatically. No change to existing columns,
  policies, or grants. `anon` still has no direct access to the table.
- Apply via Supabase SQL editor; also append to supabase/schema.sql so the file stays the
  source of truth.

### 2. Extract the profile card for reuse
- Pull the inline `Metric` component out of src/app/profile/page.tsx into
  `src/components/FanProfileCard.tsx` (or a `ProfileTraits` component), so the private
  profile page and the public share page render identical visuals. No behavior change to the
  existing page beyond importing the extracted piece.

### 3. Public unlisted share page
- New route `src/app/p/[token]/page.tsx` (server component, no auth):
  - Reads the single `fan_profiles` row by `share_token` via `createAdminClient()`, plus the
    owner's `display_name` from `users`.
  - `notFound()` if the token doesn't resolve.
  - Renders a read-only, polished version of the profile card (personality type, trait bars,
    summary, display name) + a FanBrain CTA ("Find your World Cup fan personality").
  - Exposes ONLY: personality_type, four scores, summary, display_name. Never predictions,
    email, or user_id.
- Add `generateMetadata` on this route for `openGraph` + `twitter` card tags.

### 4. Open Graph / link-preview image
- New `src/app/p/[token]/opengraph-image.tsx` using `ImageResponse`, reading the same row by
  token via the admin client. Branded card showing personality type + trait scores.
- Use text/SVG only (avoid emoji — Satori renders them unreliably).
- Optional but cheap: a site-wide default `src/app/opengraph-image.tsx` so every shared link
  has a branded fallback.
- Set `metadataBase` in src/app/layout.tsx (prod URL `https://fanbrainai.vercel.app`, env-
  overridable) so OG image URLs resolve absolutely.

### 5. Share UI on the profile page
- New `src/components/ShareProfileButton.tsx` (client), placed on the profile page; receives
  the `share_token` (already available once the column exists, since the page selects `*`).
  - Builds `${origin}/p/${token}`.
  - Uses `navigator.share` when available (mobile); otherwise copy-to-clipboard + X intent
    (`https://twitter.com/intent/tweet`) + WhatsApp intent links.
  - Pre-composed text: e.g. `I'm a {personality_type} on FanBrain 🧠⚽ — find your World Cup
    fan personality:`.

## Reuse (don't rebuild)
- `createAdminClient()` — src/lib/supabase/admin.ts (public token read path).
- Extracted `Metric`/`FanProfileCard` from src/app/profile/page.tsx (shared rendering).
- Existing design tokens (`card-gradient`, `stadium-hero`, `field-arc`, `btn`).

## Risk containment
- Migration is purely additive (defaulted column + index); existing flows untouched.
- RLS stays owner-only; **no** anon grant on `fan_profiles`. The sole public read path is
  `/p/[token]`, which returns exactly one row by unguessable UUID via service role.
- Public page exposes only display_name (already public via leaderboard) + profile content.

## Verification
1. Apply migration in Supabase; confirm existing profiles get a `share_token`.
2. `npm run dev`; sign in, generate a profile, click Share — verify the URL + composed text.
3. Open `/p/<token>` in an incognito window (logged out) — the profile renders read-only.
4. Hit `/p/<token>/opengraph-image` directly — image renders; validate unfurl with a card
   checker (e.g. opengraph.xyz) or by pasting into X/iMessage.
5. Confirm a random/invalid token returns 404, and that predictions/email are never present
   in the page or image payloads.
6. `npx tsc --noEmit` clean.

## Effort
~1.5–2 days. Additive throughout; no existing route, component, or RLS policy is modified
(beyond the small, mechanical `Metric` extraction).

## Future extensions (out of scope for first pass)
- Shareable per-prediction cards (pick + AI verdict), reusing the same token + OG pattern.
- Shareable leaderboard rank.
