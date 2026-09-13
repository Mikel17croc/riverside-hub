-- ============================================================================
-- Riverside Community Hub — Database Schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Idempotent-ish: drops nothing destructive, but safe to re-run on a fresh DB.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist"; -- needed for exclusion constraint (no double-booking)

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('member', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_tier as enum ('free', 'standard', 'family');
exception when duplicate_object then null; end $$;

do $$ begin
  create type resource_type as enum ('room', 'equipment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type donation_type as enum ('one_off', 'recurring_pledge');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth.users, created via trigger on signup
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role user_role not null default 'member',
  membership_tier membership_tier not null default 'free',
  joined_at timestamptz not null default now(),
  membership_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with app-specific profile & role data.';

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, membership_tier, membership_expires_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'member',
    'free',
    now() + interval '365 days'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- resources — bookable rooms & equipment
-- ----------------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type resource_type not null,
  category text not null,          -- e.g. 'Meeting Room', 'Event Hall', 'Projector', 'Sports Equipment'
  capacity int,
  description text default '',
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- bookings — with DB-level double-booking prevention
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time)
);

-- Prevent overlapping APPROVED or PENDING bookings for the same resource.
-- (Two pending requests for the same slot are allowed to be *requested*,
--  but only one can ever be approved — the API enforces that at approval time
--  using this same exclusion logic; here we hard-block overlap for
--  non-rejected/cancelled bookings to stop double-*approval* races.)
alter table public.bookings drop constraint if exists no_overlapping_bookings;
alter table public.bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    resource_id with =,
    tstzrange(start_time, end_time) with &&
  )
  where (status = 'approved');

create index if not exists idx_bookings_resource on public.bookings(resource_id);
create index if not exists idx_bookings_member on public.bookings(member_id);
create index if not exists idx_bookings_status on public.bookings(status);

-- ----------------------------------------------------------------------------
-- campaigns — donation drives / funding goals
-- ----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  goal_amount numeric(12,2) not null default 0,
  current_amount numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- donations
-- ----------------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default uuid_generate_v4(),
  donor_id uuid references public.profiles(id) on delete set null, -- nullable = anonymous
  donor_name text,          -- captured for anonymous/guest donors
  donor_email text,
  amount numeric(12,2) not null check (amount > 0),
  type donation_type not null default 'one_off',
  campaign_id uuid references public.campaigns(id) on delete set null,
  message text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_campaign on public.donations(campaign_id);

-- Keep campaign.current_amount in sync automatically
create or replace function public.bump_campaign_total()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.campaign_id is not null then
    update public.campaigns
      set current_amount = current_amount + new.amount
      where id = new.campaign_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_donation_inserted on public.donations;
create trigger on_donation_inserted
  after insert on public.donations
  for each row execute function public.bump_campaign_total();

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);

-- Notify the member whenever their booking's status changes
create or replace function public.notify_booking_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.notifications (user_id, message)
    values (
      new.member_id,
      'Your booking for ' || to_char(new.start_time, 'DD Mon YYYY HH24:MI') || ' is now ' || new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_status_change on public.bookings;
create trigger on_booking_status_change
  after update on public.bookings
  for each row execute function public.notify_booking_status_change();

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Helper: is the current user staff or admin?
-- ----------------------------------------------------------------------------
create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.bookings enable row level security;
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.notifications enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
  -- members can edit their own contact info but cannot self-promote role

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ---------- resources ----------
drop policy if exists "resources_select_all" on public.resources;
create policy "resources_select_all" on public.resources
  for select using (true); -- public catalogue, readable by everyone

drop policy if exists "resources_write_staff" on public.resources;
create policy "resources_write_staff" on public.resources
  for insert with check (public.is_staff_or_admin());

drop policy if exists "resources_update_staff" on public.resources;
create policy "resources_update_staff" on public.resources
  for update using (public.is_staff_or_admin());

drop policy if exists "resources_delete_admin" on public.resources;
create policy "resources_delete_admin" on public.resources
  for delete using (public.is_admin());

-- ---------- bookings ----------
drop policy if exists "bookings_select_own_or_staff" on public.bookings;
create policy "bookings_select_own_or_staff" on public.bookings
  for select using (member_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings
  for insert with check (member_id = auth.uid());

drop policy if exists "bookings_update_own_cancel" on public.bookings;
-- members may only cancel their own *pending* bookings
create policy "bookings_update_own_cancel" on public.bookings
  for update using (member_id = auth.uid() and status = 'pending')
  with check (member_id = auth.uid());

drop policy if exists "bookings_update_staff" on public.bookings;
create policy "bookings_update_staff" on public.bookings
  for update using (public.is_staff_or_admin());

-- ---------- campaigns ----------
drop policy if exists "campaigns_select_all" on public.campaigns;
create policy "campaigns_select_all" on public.campaigns
  for select using (true);

drop policy if exists "campaigns_write_admin" on public.campaigns;
create policy "campaigns_write_admin" on public.campaigns
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- donations ----------
-- insert-open to the public (anon or authenticated) — funders/donors don't need an account
drop policy if exists "donations_insert_open" on public.donations;
create policy "donations_insert_open" on public.donations
  for insert with check (true);

drop policy if exists "donations_select_own_or_staff" on public.donations;
create policy "donations_select_own_or_staff" on public.donations
  for select using (donor_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "donations_update_admin" on public.donations;
create policy "donations_update_admin" on public.donations
  for update using (public.is_admin());

drop policy if exists "donations_delete_admin" on public.donations;
create policy "donations_delete_admin" on public.donations
  for delete using (public.is_admin());

-- ---------- notifications ----------
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_system" on public.notifications
  for insert with check (public.is_staff_or_admin() or user_id = auth.uid());

-- ============================================================================
-- SEED DATA
-- ============================================================================
insert into public.campaigns (title, description, goal_amount, current_amount, active)
values
  ('Winter Food Parcels 2026', 'Help us provide warm meals and food parcels to families this winter.', 50000, 0, true)
on conflict do nothing;

insert into public.resources (name, type, category, capacity, description)
values
  ('Main Hall', 'room', 'Event Hall', 120, 'Large hall for community events and gatherings.'),
  ('Meeting Room A', 'room', 'Meeting Room', 10, 'Small meeting room with whiteboard and TV screen.'),
  ('Youth Activity Room', 'room', 'Activity Room', 25, 'Used for after-school youth programmes.'),
  ('Projector & Screen Kit', 'equipment', 'AV Equipment', null, 'Portable projector with screen and HDMI cables.'),
  ('Gym Equipment Set', 'equipment', 'Sports Equipment', null, 'Weights, mats and resistance bands for the small gym.')
on conflict do nothing;

-- ============================================================================
-- NOTE ON ADMIN BOOTSTRAP
-- ============================================================================
-- New signups default to role='member'. To promote the first admin, sign up
-- normally via the app, then run (once, using the Supabase SQL editor):
--   update public.profiles set role = 'admin' where id = '<the-users-auth-uid>';
