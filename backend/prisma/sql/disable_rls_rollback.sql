-- Emergency rollback for enable_rls.sql. Re-opens the database to the public anon key,
-- so only use it to unblock something, then fix forward.

begin;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', t.tablename);
  end loop;
end $$;

grant insert, update, delete, truncate on all tables in schema public to anon, authenticated;

drop policy if exists "Public can read banners" on public.banners;
drop policy if exists "Public can read categories" on public.categories;

-- Original Realtime publication as found on 2026-11-04
alter publication supabase_realtime set table
  public.users, public.refresh_tokens, public.password_resets, public.organisers,
  public.venues, public.artists, public.events, public.event_artists, public.ticket_types,
  public.orders, public.order_items, public.tickets, public.platform_settings,
  public.audit_logs, public.banners;

commit;
