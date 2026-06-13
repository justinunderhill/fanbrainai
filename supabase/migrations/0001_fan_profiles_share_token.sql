-- Shareable fan profile: additive migration.
-- Adds an unguessable share handle to fan_profiles for the public /p/[token] page.
-- Purely additive: the defaulted column backfills existing rows, and no existing
-- column, policy, or grant is changed. The token is read server-side through the
-- service-role admin client, so owner-only RLS stays intact (no anon grant added).

alter table public.fan_profiles
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists fan_profiles_share_token_key
  on public.fan_profiles(share_token);
