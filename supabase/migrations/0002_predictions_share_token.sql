-- Shareable prediction update: additive migration.
-- Adds an unguessable share handle to predictions for the public /r/[token] page,
-- where a fan can share a single settled pick (their call vs the result + AI debrief).
-- Purely additive: the defaulted column backfills existing rows, and no existing
-- column, policy, or grant is changed. The token is read server-side through the
-- service-role admin client, so owner-only RLS stays intact (no anon grant added).

alter table public.predictions
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists predictions_share_token_key
  on public.predictions(share_token);
