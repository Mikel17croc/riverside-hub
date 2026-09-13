# Client Handover — Riverside Community Hub Platform

This document is written for Riverside's staff and admin team, not
developers. It explains how to log in and do the day-to-day tasks the
platform supports.

## Logging in

1. Go to the platform's web address.
2. If you already have an account, click **Log in** and enter your email and
   password.
3. If you're new, click **Sign up**, fill in your details, and check your
   email for a verification link before logging in.
4. Staff and admin accounts are regular member accounts that have been
   **upgraded** by a developer/admin after signup — see "Promoting someone to
   staff or admin" below. There's no separate staff signup form.

## What staff can do

Once logged in with a staff (or admin) account, a **Staff Dashboard** link
appears in the top navigation.

### Approving or rejecting booking requests

1. Open **Staff Dashboard**.
2. The **Pending bookings** section lists every booking request awaiting a
   decision, showing the resource, the requesting member, and the requested
   time.
3. Click **Approve** or **Reject**. The member is notified automatically —
   they'll see it next time they check their notifications/bookings.
4. If two people request the same room for an overlapping time and you
   approve both, the platform will refuse the second approval and tell you
   there's a conflict — you don't need to manually check for overlaps.

### Looking up members

1. On the same dashboard, use the **Member directory** search box to find
   someone by name.
2. You can see their membership tier, role, and join date. To change a
   member's tier or renewal date, use the API directly for now (see
   `docs/API.md`, `PATCH /profiles/:id`) — a dedicated edit button in the
   dashboard is a natural next feature to add.

## What admins can do (everything staff can, plus)

Open the **Admin** link in the navigation (visible to admins only).

### Viewing reports

The Admin Dashboard shows, at a glance:
- Pending bookings
- Bookings made this month
- Active members out of total members
- Total donations received (across all campaigns)
- Progress bars for every donation campaign (goal vs. raised so far)

### Exporting donations

Click **Export donations (CSV)** on the Admin Dashboard. This downloads a
spreadsheet-ready file of every donation ever recorded — useful for
reporting to funders or the board. Open it in Excel or Google Sheets.

### Promoting someone to staff or admin

This is currently done directly in the Supabase database (there's no "make
this person staff" button in the UI yet — a good candidate for a future
iteration):

1. Log in to the Supabase dashboard for this project.
2. Go to **Table Editor → profiles**.
3. Find the person's row (search by name) and change their `role` column
   from `member` to `staff` or `admin`.
4. Ask them to refresh the page — their new permissions apply immediately.

### Renewing a membership manually

There's no payment gateway yet (see "What this platform doesn't do" below),
so renewals are manual:
1. In Supabase → Table Editor → profiles, find the member.
2. Update their `membership_expires_at` field to the new expiry date.
3. The platform automatically shows members a warning banner on their
   profile page starting 30 days before expiry, and after it lapses.

### Creating or editing donation campaigns / facilities

For now, new campaigns and facility/equipment listings are created via the
API (see `docs/API.md`) rather than a UI form — this is the most impactful
next feature to build if you want fully self-serve admin control.

## What members (the public) can do

- Browse facilities and equipment, and see what's booked on any given day,
  without an account.
- Sign up, then request a booking — it starts as "pending" until staff
  approve it.
- View and cancel their own pending bookings.
- Update their contact details and see their own membership status.
- Donate — one-off or "adopt a food parcel" (a recurring pledge, logged but
  not automatically charged — see below).
- Donate anonymously without creating an account at all.

## What this platform doesn't do (yet)

Being upfront about this matters for planning your next phase:

- **No real payments.** Donations and their amounts are recorded for
  reporting, but no money actually moves through the platform — you'd still
  collect payment via EFT, card machine, or a payment gateway integration
  (Stripe/Paystack test mode is scoped as a stretch goal).
- **No automatic recurring billing.** An "adopt a food parcel" pledge is
  logged as an intention, not charged monthly.
- **No automated reminder emails** for upcoming bookings or expiring
  memberships — renewals and reminders are currently a manual staff task.
- **No waitlist** for fully booked resources — a member simply can't book an
  already-approved slot.

None of these are technical dead ends — they're documented next steps, not
missing foundations. The underlying data model (campaigns, donations,
bookings, notifications) already supports building each of them without a
redesign.

## Who to contact

For bugs, access issues, or feature requests, contact the development team
via the channel agreed at project handover (see the project's GitHub repo
for issue tracking).
