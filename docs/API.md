# API Reference

Base URL: `http://localhost:4000/api` (dev) or your deployed backend URL + `/api`.

All authenticated requests send `Authorization: Bearer <supabase-access-token>`,
obtained from the frontend's Supabase session after login. Request/response
field names and types match `shared/api-types.ts` exactly.

## Conventions

- **Auth column**: `public` (no token needed), `optional` (works either way,
  behavior may differ), `member+` (any logged-in user), `staff+` (staff or
  admin), `admin` (admin only).
- Paginated list endpoints accept `?page=1&pageSize=20` and return:
  ```json
  { "data": [...], "page": 1, "pageSize": 20, "total": 42 }
  ```
- Errors return:
  ```json
  { "error": "Human-readable message", "details": { } }
  ```
  with an appropriate HTTP status (400 validation, 401 unauthenticated, 403
  forbidden, 404 not found, 409 conflict, 500 server error).

---

## Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profiles/me` | member+ | The logged-in user's own profile |
| PATCH | `/profiles/me` | member+ | Update own `full_name` / `phone` |
| GET | `/profiles?search=&page=&pageSize=` | staff+ | Member directory, searchable by name, paginated |
| PATCH | `/profiles/:id` | staff+ | Update a member's `membership_tier` / `membership_expires_at`; `role` changes require admin |

**PATCH /profiles/me** body:
```json
{ "full_name": "Jane Doe", "phone": "+27 71 234 5678" }
```

**PATCH /profiles/:id** body (staff/admin):
```json
{ "membership_tier": "standard", "membership_expires_at": "2027-01-01T00:00:00Z" }
```
Add `"role": "staff"` — admin only, 403 otherwise.

---

## Resources (bookable rooms & equipment)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/resources?type=room\|equipment` | public | Active resource catalogue |
| GET | `/resources/:id/availability?date=YYYY-MM-DD` | public | Pending/approved bookings for that resource on that day |
| POST | `/resources` | staff+ | Create a resource |
| PATCH | `/resources/:id` | staff+ | Update a resource (including `active: false` to hide it) |
| DELETE | `/resources/:id` | admin | Hard delete (prefer `active: false` via PATCH) |

**POST /resources** body:
```json
{
  "name": "Main Hall",
  "type": "room",
  "category": "Event Hall",
  "capacity": 120,
  "description": "Large hall for community events.",
  "image_url": null
}
```

---

## Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/bookings/mine?page=&pageSize=` | member+ | The caller's own bookings |
| GET | `/bookings?status=&page=&pageSize=` | staff+ | All bookings, optionally filtered by status |
| POST | `/bookings` | member+ | Request a booking (status starts `pending`) |
| PATCH | `/bookings/:id/status` | member+ / staff+ | Owner can cancel their own `pending` booking; staff/admin can `approved`/`rejected`/`cancelled` any booking |

**POST /bookings** body:
```json
{
  "resource_id": "uuid",
  "start_time": "2026-10-01T09:00:00.000Z",
  "end_time": "2026-10-01T10:00:00.000Z",
  "notes": "Youth mentorship session"
}
```
Returns `201` with the created booking, or `409` if the slot is already
approved for that resource (checked both as a friendly pre-check and as a
Postgres exclusion constraint, so it's race-safe).

**PATCH /bookings/:id/status** body:
```json
{ "status": "approved" }
```

---

## Campaigns (donation drives)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/campaigns` | public | All campaigns (active and past) |
| POST | `/campaigns` | admin | Create a campaign |
| PATCH | `/campaigns/:id` | admin | Update a campaign (title, goal, `active`) |

**POST /campaigns** body:
```json
{ "title": "Winter Food Parcels 2026", "description": "...", "goal_amount": 50000, "active": true }
```
`current_amount` is derived automatically from donations — you cannot set it directly.

---

## Donations

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/donations` | optional | Record a donation — logged in or anonymous |
| GET | `/donations/mine` | member+ | The caller's own donation history |
| GET | `/donations?page=&pageSize=` | staff+ | All donations, paginated |
| GET | `/donations/export.csv` | staff+ | CSV export of all donations |

**POST /donations** body:
```json
{
  "amount": 250,
  "type": "one_off",
  "campaign_id": "uuid",
  "donor_name": "Jane Doe",
  "donor_email": "jane@example.com",
  "message": "Keep up the great work!"
}
```
`donor_name`/`donor_email` are required only when not authenticated (used to
identify an anonymous/guest donor). `type` is `"one_off"` or
`"recurring_pledge"` — a pledge is logged as donor intent only; no recurring
billing actually runs (see brief §5.3 and Stretch Goals).

---

## Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | member+ | The caller's own notifications (most recent 50) |
| PATCH | `/notifications/:id/read` | member+ | Mark a notification as read |

Notifications are created automatically by a database trigger whenever a
booking's status changes — there is no manual "create notification" endpoint.

---

## Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/summary` | staff+ | Dashboard KPIs |

**GET /admin/summary** response:
```json
{
  "pendingBookings": 3,
  "bookingsThisMonth": 12,
  "activeMembers": 48,
  "totalMembers": 55,
  "totalDonations": 18250
}
```

---

## Health check

`GET /health` → `{ "status": "ok", "time": "2026-09-13T12:00:00.000Z" }` — no auth, used for uptime checks.
