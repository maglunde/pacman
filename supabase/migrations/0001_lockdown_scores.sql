-- Lock down anonymous_scores so only the service_role (edge functions) can insert.
-- Anon clients must go through the submit-score edge function, which enforces
-- session-token signing, freshness, one-shot use, plausibility and rate limits.
--
-- Apply manually via the Supabase SQL editor. Safe to re-run: uses IF NOT EXISTS
-- and DROP POLICY IF EXISTS.

-- 1. Revoke direct anon insert on the scores table.
revoke insert on public.anonymous_scores from anon;
revoke insert on public.anonymous_scores from authenticated;

-- If RLS policies on the table allow anon insert, drop them.
do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename  = 'anonymous_scores'
          and cmd        = 'INSERT'
    loop
        execute format('drop policy if exists %I on public.anonymous_scores', pol.policyname);
    end loop;
end $$;

-- Make sure RLS is enabled; without a permissive policy this blocks anon writes.
alter table public.anonymous_scores enable row level security;

-- service_role bypasses RLS but still needs table-level grants. Be explicit so
-- this migration works regardless of how the table was originally created.
grant insert, select on public.anonymous_scores to service_role;

-- Keep SELECT open on the view so the client can still read the leaderboard.
grant select on public.anonymous_leaderboard to anon;

-- 2. used_sessions — one-shot session ids to prevent replay of a signed token.
create table if not exists public.used_sessions (
    sid     text primary key,
    used_at timestamptz not null default now()
);

alter table public.used_sessions enable row level security;
grant all on public.used_sessions to service_role;
-- No policies: only service_role (bypasses RLS) may read/write.

-- Cleanup helper: remove session records older than 24h. Call from a scheduled
-- job or cron extension if desired.
create or replace function public.cleanup_used_sessions()
returns void
language sql
as $$
    delete from public.used_sessions where used_at < now() - interval '24 hours';
$$;

-- 3. submit_rate — per-IP submit counter with a rolling 1h window.
create table if not exists public.submit_rate (
    ip_hash      text        primary key,
    window_start timestamptz not null default now(),
    count        int         not null default 0
);

alter table public.submit_rate enable row level security;
grant all on public.submit_rate to service_role;
-- No policies: only service_role may read/write.
