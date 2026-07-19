-- ═══════════════════════════════════════════════════════════════════════════
-- InvenTrack — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Database → SQL Editor
-- → New query → paste this whole file → Run).
--
-- This version adds: items.locker, items.condition, logs.condition_out /
-- logs.condition_in (for equipment pull-outs), and a new `restocks` table
-- (adding quantity to an EXISTING item — separate from creating a new item).
--
-- Safe to re-run from scratch: it drops old versions first.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Clean slate (safe to run even if these don't exist yet) ───────────────
drop view if exists staff_public;
drop function if exists verify_pin(uuid, text);
drop function if exists create_staff(text, text, text);
drop function if exists set_pin(uuid, text);
drop table if exists damage_records;
drop table if exists restocks;
drop table if exists logs;
drop table if exists items;
drop table if exists staff;

create extension if not exists pgcrypto;

-- ─── Staff (people who can use the app) ─────────────────────────────────────
-- PINs are hashed with bcrypt (via pgcrypto), never stored as plain text.
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- ─── Items ───────────────────────────────────────────────────────────────────
create table items (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null check (category in ('marketing', 'production', 'merch', 'equipment')),
  stock integer not null default 0,
  unit text not null,
  min_stock integer not null default 1,
  max_stock integer not null default 10,
  pack_price numeric not null default 0,  -- price of one pack/ream/box, in pesos
  pack_size integer not null default 1,   -- units per pack, e.g. 500 sheets per ream
  qty_step integer not null default 1,    -- pull-out quantity increment, e.g. 10 for bond paper
  returnable boolean not null default false, -- true = borrow/return tracked (equipment); false = pulled-out and consumed (materials)
  location text default '',
  locker text default '',        -- e.g. "Locker 1", "Locker 2"
  condition text default '',     -- hardware condition, e.g. "Good", "Needs repair"
  supplier text default '',
  description text default '',
  image_url text,
  last_updated date not null default current_date
);

-- ─── Logs (one unified pull-out/return record — powers Requests + History) ─
-- `purpose` is used for materials pull-outs; `condition_out`/`condition_in`
-- are used for equipment pull-outs (condition when borrowed / when returned).
create table logs (
  id bigint generated always as identity primary key,
  display_id text generated always as ('REQ-' || lpad(id::text, 4, '0')) stored,
  item_id bigint references items(id) on delete set null,
  item text not null,
  category text not null,
  qty integer not null,
  unit text not null,
  staff_id uuid references staff(id),
  employee text not null,
  dept text default '',
  purpose text default '',
  borrow_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'returned')),
  returned_at timestamptz,
  confirmed_by text,  -- staff account logged in when this pull-out was confirmed
  approved_by text,   -- staff account that processed the return
  needs_return boolean not null default false, -- snapshotted from the item's "returnable" setting at pull-out time
  condition_out text,
  condition_in text,
  cost numeric not null default 0  -- computed peso cost of this pull-out, snapshotted at time of pull-out
);

-- ─── Restocks (adding quantity to an EXISTING item — separate from Add Item) ─
create table restocks (
  id bigint generated always as identity primary key,
  item_id bigint references items(id) on delete set null,
  item text not null,
  qty integer not null,
  staff_id uuid references staff(id),
  name text not null,           -- who restocked it
  date date not null default current_date
);

-- ─── Damage Records ──────────────────────────────────────────────────────────
-- Created when a returnable (equipment) item comes back Damaged / Needs repair.
-- The repair/damage cost here — NOT the item's full replacement value — is
-- what actually counts toward Usage Cost / Value Pulled Out.
create table damage_records (
  id bigint generated always as identity primary key,
  log_id text,  -- the logs.display_id this damage was reported on, if any (not a hard FK since display_id isn't unique-indexed)
  item_id bigint references items(id) on delete set null,
  item text not null,
  title text not null,
  description text default '',
  cost numeric not null default 0,
  date date not null default current_date,
  receipt_url text not null,   -- data URL of the uploaded receipt (image or PDF) — required
  created_by text,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PIN auth functions (security definer = can read/write pin_hash safely,
-- without ever exposing it to the client)
--
-- search_path includes "extensions", where Supabase installs pgcrypto
-- (gen_salt, crypt) — required for crypt()/gen_salt() to resolve.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function verify_pin(staff_id uuid, pin_attempt text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select pin_hash into stored_hash from staff where id = staff_id;
  if stored_hash is null then
    return false;
  end if;
  return stored_hash = crypt(pin_attempt, stored_hash);
end;
$$;

create or replace function create_staff(p_name text, p_pin text, p_role text default 'staff')
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
begin
  insert into staff (name, pin_hash, role)
  values (p_name, crypt(p_pin, gen_salt('bf')), p_role)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function set_pin(p_staff_id uuid, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update staff set pin_hash = crypt(p_new_pin, gen_salt('bf')) where id = p_staff_id;
end;
$$;

create or replace function delete_staff(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_role text;
  admin_count int;
begin
  select role into target_role from staff where id = p_staff_id;
  if target_role = 'admin' then
    select count(*) into admin_count from staff where role = 'admin';
    if admin_count <= 1 then
      raise exception 'Cannot delete the last remaining admin account.';
    end if;
  end if;
  delete from staff where id = p_staff_id;
end;
$$;

-- ─── A safe public view: name + role only, never the pin hash ──────────────
create or replace view staff_public as
  select id, name, role from staff;

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
--
-- IMPORTANT — read this:
-- This app does NOT use Supabase Auth sessions (no email/password). The PIN
-- screen is an in-app identity check, not a database-level security boundary.
-- These policies are intentionally open (any request using your public anon
-- key can read/write items and logs) so the app works without a login wall
-- at the database level. That's a reasonable tradeoff for a small internal
-- tool tracking paper and supplies — just don't store anything sensitive in
-- here. The `staff` table itself stays locked down: only the view above
-- (no pin_hash) and the functions above (which never return pin_hash) are
-- reachable from the app.
-- ═══════════════════════════════════════════════════════════════════════════

alter table staff enable row level security;
alter table items enable row level security;
alter table logs enable row level security;
alter table restocks enable row level security;
alter table damage_records enable row level security;

-- No direct policies on `staff` — it's only reachable via staff_public / RPCs.

create policy "items are readable" on items for select using (true);
create policy "items are insertable" on items for insert with check (true);
create policy "items are updatable" on items for update using (true);
create policy "items are deletable" on items for delete using (true);

create policy "logs are readable" on logs for select using (true);
create policy "logs are insertable" on logs for insert with check (true);
create policy "logs are updatable" on logs for update using (true);

create policy "restocks are readable" on restocks for select using (true);
create policy "restocks are insertable" on restocks for insert with check (true);

create policy "damage_records are readable" on damage_records for select using (true);
create policy "damage_records are insertable" on damage_records for insert with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on items to anon, authenticated;
grant select, insert, update on logs to anon, authenticated;
grant select, insert on restocks to anon, authenticated;
grant select, insert on damage_records to anon, authenticated;
grant select on staff_public to anon, authenticated;
grant execute on function verify_pin(uuid, text) to anon, authenticated;
grant execute on function create_staff(text, text, text) to anon, authenticated;
grant execute on function set_pin(uuid, text) to anon, authenticated;
grant execute on function delete_staff(uuid) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data — your starting admin account + the same items from the demo
-- ═══════════════════════════════════════════════════════════════════════════

-- Default admin login: name "Admin", PIN "0000" — change this PIN once you're in!
select create_staff('Admin', '0000', 'admin');

insert into items (name, category, stock, unit, min_stock, max_stock, location, locker, condition, supplier, description, pack_price, pack_size, qty_step, returnable) values
  ('Heat Press Machine', 'equipment', 2, 'unit', 1, 4, 'Storage A-1', 'Locker 1', 'Good', 'PrintTech Supply', 'Used for transferring designs onto shirts and merch.', 0, 1, 1, true),
  ('Laminator', 'equipment', 1, 'unit', 1, 2, 'Storage A-1', 'Locker 1', 'Good', 'PrintTech Supply', 'A3 roll laminator for finishing printed materials.', 0, 1, 1, true),
  ('Cutter Machine', 'equipment', 1, 'unit', 1, 2, 'Storage A-2', 'Locker 1', 'Good', 'Vinyl Worx', 'Vinyl and sticker cutting machine.', 0, 1, 1, true),
  ('Sony A7 IV Camera', 'equipment', 2, 'pcs', 1, 4, 'Storage A-2', 'Locker 1', 'Good', 'Sony Philippines', 'Used for product and event photography.', 0, 1, 1, true),
  ('Scissors', 'equipment', 5, 'pcs', 2, 10, 'Storage B-1', 'Locker 2', 'Good', 'Office Depot', 'General purpose cutting tool.', 0, 1, 1, true),
  ('Stapler', 'equipment', 0, 'pcs', 1, 4, 'Storage B-1', 'Locker 2', 'Needs repair', 'Office Depot', 'Heavy duty stapler.', 0, 1, 1, true),
  ('Bond Paper A4', 'production', 9000, 'pcs', 2500, 15000, 'Storage B-2', 'Locker 2', 'Good', 'PaperOne PH', 'Standard printing paper, A4 size. Tracked per sheet — 500 sheets per ream.', 300, 500, 10, false),
  ('Vinyl Sticker Roll', 'production', 3, 'roll', 2, 10, 'Storage B-2', 'Locker 2', 'Good', 'Vinyl Worx', 'Glossy vinyl roll for sticker printing.', 0, 1, 1, false),
  ('Ink Cartridge (CMYK Set)', 'production', 1, 'set', 2, 6, 'Storage B-2', 'Locker 2', 'Good', 'PrintTech Supply', 'Full color set for the production printer.', 0, 1, 1, false),
  ('Lamination Film', 'production', 4, 'roll', 2, 8, 'Storage B-2', 'Locker 2', 'Good', 'PrintTech Supply', 'Matte lamination film, 250m roll.', 0, 1, 1, false),
  ('Tarpaulin Banner (3x5ft)', 'marketing', 6, 'pcs', 2, 12, 'Storage C-1', 'Locker 1', 'Good', 'Vinyl Worx', 'Pre-printed promotional tarpaulin banners.', 0, 1, 1, false),
  ('Flyers (A5)', 'marketing', 200, 'pcs', 50, 500, 'Storage C-1', 'Locker 1', 'Good', 'PrintTech Supply', 'Promotional flyers for events and campaigns.', 0, 1, 1, false),
  ('Business Cards', 'marketing', 80, 'pcs', 50, 300, 'Storage C-1', 'Locker 1', 'Good', 'PrintTech Supply', 'Standard 3.5x2in business cards.', 0, 1, 1, false),
  ('Tote Bags', 'merch', 45, 'pcs', 10, 100, 'Storage D-1', 'Locker 2', 'Good', 'Merch Manila', 'Canvas tote bags, blank for printing.', 0, 1, 1, false),
  ('Printed Shirts (S–XL)', 'merch', 20, 'pcs', 5, 60, 'Storage D-1', 'Locker 2', 'Good', 'Merch Manila', 'Pre-printed company shirts, assorted sizes.', 0, 1, 1, false),
  ('Caps', 'merch', 15, 'pcs', 5, 40, 'Storage D-1', 'Locker 2', 'Good', 'Merch Manila', 'Embroidered company caps.', 0, 1, 1, false);