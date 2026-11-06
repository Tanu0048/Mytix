-- Lock down the Supabase public schema.
--
-- The anon key ships inside every web/mobile build, so anything the `anon` role can
-- read or write is effectively public. The backend connects as `postgres`, which has
-- BYPASSRLS, so it is NOT affected by anything in this file.
--
-- Safe to re-run (idempotent). Re-run it after adding new tables with Prisma, because
-- new tables start with RLS disabled.
--
-- Rollback: prisma/sql/disable_rls_rollback.sql

begin;

-- 1. Enable RLS on every table in public. With no policy, anon/authenticated get no rows.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 2. Browsers never write directly; all writes go through the backend.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- 3. The only tables the web app reads directly (home page Realtime refresh).
drop policy if exists "Public can read banners" on public.banners;
create policy "Public can read banners" on public.banners
  for select to anon, authenticated using (true);

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories
  for select to anon, authenticated using (true);

-- 4. Realtime only broadcasts what the web app subscribes to. Previously it also
--    published users, refresh_tokens, password_resets, orders, tickets, ...
alter publication supabase_realtime set table public.banners, public.categories;

commit;
