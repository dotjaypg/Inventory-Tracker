-- Fix for "Clear History" failing with "Something went wrong".
-- SAFE to run on the LIVE database: it does not delete or change any data.
-- It only (re)creates the settings table, permissions, and two functions.
--
-- How: Supabase > SQL Editor > New query > paste this whole file > Run.

create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

drop policy if exists "app_settings are readable" on app_settings;
drop policy if exists "app_settings are insertable" on app_settings;
drop policy if exists "app_settings are updatable" on app_settings;
create policy "app_settings are readable" on app_settings for select using (true);
create policy "app_settings are insertable" on app_settings for insert with check (true);
create policy "app_settings are updatable" on app_settings for update using (true);

create or replace function get_db_size_mb()
returns numeric
language sql
security definer
set search_path = public
as $$
  select round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2);
$$;

create or replace function clear_history(p_clear_logs boolean, p_clear_restocks boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Never erase the record of equipment that is still out.
  if p_clear_logs and exists (select 1 from logs where status = 'active') then
    raise exception 'Some borrowed items are not returned yet. Return them first, then clear history.';
  end if;
  if p_clear_logs then
    delete from logs where id is not null;
  end if;
  if p_clear_restocks then
    delete from restocks where id is not null;
  end if;
  insert into app_settings (key, value, updated_at)
  values ('last_cleared_at', now()::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
end;
$$;

grant select, insert, update on app_settings to anon, authenticated;
grant execute on function get_db_size_mb() to anon, authenticated;
grant execute on function clear_history(boolean, boolean) to anon, authenticated;

-- Tell the API to pick up the new/changed functions right away.
notify pgrst, 'reload schema';
