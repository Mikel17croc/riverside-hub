-- ============================================================================
-- Riverside Community Hub — Optional Demo Seed Data
--
-- schema.sql already inserts the required minimum seed data (1 campaign,
-- 5 resources — 3 room types + 2 equipment categories, per the brief).
-- This file adds a few EXTRA anonymous donations and a second campaign so a
-- demo/staging environment has something to show on first login.
--
-- Run AFTER schema.sql. Safe to run multiple times (each donation row is
-- distinct but harmless to duplicate for a demo DB).
--
-- NOTE: profiles/bookings tied to real member accounts can't be seeded here
-- because profiles.id is a foreign key to auth.users(id), which only gets
-- populated when someone actually signs up through Supabase Auth. To get
-- demo bookings:
--   1. Sign up 2-3 test accounts through the app (e.g. member1@test.com).
--   2. Promote one to staff/admin via:
--        update public.profiles set role = 'staff' where id = '<uid>';
--   3. Use the app UI to create a few bookings as the member account, then
--      approve/reject them as staff — this exercises the full RLS path.
-- ============================================================================

-- A second, closed campaign to demonstrate the "active" flag / reporting filter
insert into public.campaigns (title, description, goal_amount, current_amount, active)
values
  ('Youth Programme Backpacks 2025', 'Fully funded — thank you to everyone who donated school backpacks and stationery.', 15000, 15000, false)
on conflict do nothing;

-- Anonymous donations against the live "Winter Food Parcels 2026" campaign
-- (current_amount is kept in sync automatically by the on_donation_inserted trigger)
insert into public.donations (donor_id, donor_name, donor_email, amount, type, campaign_id, message)
select
  null,
  d.donor_name,
  d.donor_email,
  d.amount,
  d.type::donation_type,
  c.id,
  d.message
from public.campaigns c
cross join (values
  ('Naledi M.', 'naledi@example.com', 500.00, 'one_off',            'For the little ones this winter ❤️'),
  ('Anonymous', null,                  1200.00,'one_off',            null),
  ('Sipho K.',  'sipho@example.com',   250.00, 'recurring_pledge',   'Adopting a food parcel monthly'),
  ('Anonymous', null,                  3000.00,'one_off',            'From all of us at Thabo & Co.')
) as d(donor_name, donor_email, amount, type, message)
where c.title = 'Winter Food Parcels 2026'
on conflict do nothing;
