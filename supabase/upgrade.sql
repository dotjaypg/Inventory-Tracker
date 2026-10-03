-- Upgrade an EXISTING database to the latest version.
-- SAFE to run on the LIVE database, and safe to run more than once:
-- it never deletes or changes your items, logs, or staff.
-- (New, empty projects use schema.sql instead.)
--
-- How: Supabase > SQL Editor > New query > paste this whole file > Run.

-- Restocks remember how much was paid (shown in Reports as "Bought").
alter table restocks add column if not exists cost numeric not null default 0;

-- Deleting a staff member keeps their past records (instead of failing).
alter table logs drop constraint if exists logs_staff_id_fkey;
alter table logs add constraint logs_staff_id_fkey
  foreign key (staff_id) references staff(id) on delete set null;
alter table restocks drop constraint if exists restocks_staff_id_fkey;
alter table restocks add constraint restocks_staff_id_fkey
  foreign key (staff_id) references staff(id) on delete set null;


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

-- Changes an item's stock in ONE step so two people acting at the same time
-- can't overwrite each other. Refuses to go below 0.
create or replace function adjust_stock(p_item_id bigint, p_delta integer, p_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
begin
  update items
     set stock = stock + p_delta, last_updated = p_date
   where id = p_item_id and stock + p_delta >= 0
  returning stock into new_stock;
  if new_stock is null then
    if not exists (select 1 from items where id = p_item_id) then
      raise exception 'This item no longer exists. Refresh the page.' using errcode = 'P0002';
    end if;
    raise exception 'Not enough stock left. Someone may have just taken it. Refresh and try again.' using errcode = 'P0001';
  end if;
  return new_stock;
end;
$$;

grant execute on function clear_history(boolean, boolean) to anon, authenticated;
grant execute on function adjust_stock(bigint, integer, date) to anon, authenticated;

-- Tell the API to pick up the new/changed functions right away.
notify pgrst, 'reload schema';
