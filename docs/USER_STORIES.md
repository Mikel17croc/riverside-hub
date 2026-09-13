# User Stories

Organized by role, per the brief's permission model (§4). Each story follows
"As a ___, I want to ___, so that ___" with acceptance criteria used to
verify the corresponding feature during QA.

## Public visitor

1. **Browse facilities**
   As a visitor, I want to see what rooms and equipment Riverside offers
   without creating an account, so that I can decide whether to become a
   member.
   - AC: `/facilities` loads with no login required and lists all active resources.

2. **Check availability before signing up**
   As a visitor, I want to see whether a room is free on a given day, so
   that I know booking is realistic before I commit to signing up.
   - AC: Selecting a resource and a date shows existing bookings for that day, without requiring login.

3. **Donate without an account**
   As a visitor, I want to donate to the food-parcel drive without creating
   a membership account, so that giving is as low-friction as possible.
   - AC: The donation form accepts a name/email (or neither, for full anonymity) when no session exists, and the donation is recorded.

4. **See donation drive progress**
   As a visitor, I want to see how close a campaign is to its goal, so that
   I feel confident my donation is going somewhere real and active.
   - AC: The donate page shows a progress bar and R amount raised vs. goal, updated immediately after a new donation.

## Member (signed up)

5. **Create an account**
   As a member of the public, I want to sign up with my email and a
   password, so that I can book facilities and track my donations.
   - AC: Signup requires email verification before the account can log in (Supabase Auth setting).

6. **Request a booking**
   As a member, I want to request a time slot for a room or equipment, so
   that I can use it for my programme/activity.
   - AC: Submitting a request creates a `pending` booking; the same slot cannot be double-booked once approved.

7. **Track my bookings**
   As a member, I want to see the status of my booking requests, so that I
   know whether I've been approved before I show up.
   - AC: `/my-bookings` lists all of a member's bookings with status badges (pending/approved/rejected/cancelled).

8. **Cancel a pending request**
   As a member, I want to cancel a booking I no longer need, so that the
   slot frees up for someone else.
   - AC: Cancel is only available while status is `pending`; approved bookings require staff to cancel.

9. **Get notified of a decision**
   As a member, I want to be told when my booking is approved or rejected,
   so that I don't have to keep checking manually.
   - AC: A notification row is created automatically the moment a booking's status changes.

10. **See my membership status**
    As a member, I want to know when my membership is expiring, so that I
    can renew it before losing access.
    - AC: The profile page shows an "Expiring soon" badge starting 30 days
      before `membership_expires_at`, and "Expired" after it passes.

## Staff

11. **Review pending bookings**
    As staff, I want to see every pending booking request in one place, so
    that I can approve or reject them efficiently.
    - AC: The staff dashboard lists all `pending` bookings with resource, member, and time.

12. **Approve or reject a booking**
    As staff, I want to approve or reject a request with one click, so that
    members get a fast answer.
    - AC: Clicking approve/reject updates the booking's status and triggers a member notification; attempting to approve a conflicting slot is blocked with a clear error.

13. **Search the member directory**
    As staff, I want to search for a member by name, so that I can look up
    their membership details when they call or visit in person.
    - AC: Typing in the search box filters the member list by name in real time.

## Admin

14. **View reporting KPIs**
    As an admin, I want a dashboard of bookings, donations, and membership
    numbers, so that I can report to the board without manual spreadsheet work.
    - AC: The admin dashboard shows pending bookings, bookings this month, active vs. total members, and total donations, computed live from the database.

15. **Export donations for funders**
    As an admin, I want to export all donation records as a CSV, so that I
    can share them with funders or our bookkeeper.
    - AC: Clicking export downloads a CSV with donor, amount, type, campaign, and date for every donation.

16. **Manage staff accounts**
    As an admin, I want to promote a member to staff, so that they can help
    manage bookings without me doing it all myself.
    - AC: Only a user with the `admin` role can change another profile's `role` field (enforced by both the API and the RLS policy, not just hidden UI).

17. **Configure programmes and campaigns**
    As an admin, I want to create and adjust donation campaigns and the
    resource catalogue, so that the platform reflects Riverside's current
    offerings.
    - AC: Only admins can create/update campaigns; staff and admins can create/update resources, but only admins can delete one.
