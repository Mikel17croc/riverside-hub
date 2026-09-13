# Riverside Community Hub

Membership, booking, and donations platform for Riverside Community Hub — a
fictional nonprofit community centre. Built as a full-stack TypeScript
application: React frontend, Express API, Supabase (Postgres + Auth + RLS)
for data and identity.

> New here? Read this file top to bottom, then see `docs/API.md` for the
> route reference and `docs/HANDOVER.md` for the staff-facing "how do I use
> this" guide.

## Contents

```
riverside-hub/
├── frontend/           React + TypeScript + Vite + Tailwind
├── backend/             Express + TypeScript API
├── supabase/             schema.sql + seed.sql (run these in your Supabase project)
├── shared/               canonical API/DB type definitions
└── docs/                 API reference, ERD, user stories, client handover doc
```

## Architecture at a glance

```
 ┌─────────────┐        HTTPS/JSON        ┌──────────────┐        Postgres wire protocol
 │   Frontend   │ ───────────────────────▶ │   Backend    │ ─────────────────────────────▶ ┌────────────┐
 │  React/Vite  │ ◀─────────────────────── │ Express API  │ ◀───────────────────────────── │  Supabase   │
 └─────────────┘                          └──────────────┘                                 │ Postgres +  │
        │                                        │                                          │ Auth + RLS │
        │        Supabase Auth (JWT) direct       │  service-role key (admin ops)            │  Storage   │
        └─────────────────────────────────────────┘                                          └────────────┘
```

- The **frontend** talks to Supabase Auth directly for sign up / log in / session
  refresh (via `@supabase/supabase-js`), then sends the resulting JWT as a
  `Bearer` token to the **backend** for every other operation.
- The **backend** verifies that JWT, loads the caller's role from `profiles`,
  and then queries Postgres either:
  - as **that user** (via a per-request Supabase client built with their JWT)
    so Row Level Security is the real enforcement boundary, or
  - via the **service-role client**, only for operations that legitimately
    need to see across RLS (e.g. staff viewing all bookings) — and only after
    an explicit `requireRole()` check in the route.
- **RLS policies in `supabase/schema.sql` are the actual security boundary.**
  The Express-level role checks are a UX/defense-in-depth layer, not the only
  gate — this was a checkpoint requirement in the brief and is true here: try
  hitting the Supabase REST API directly with a member's JWT and you still
  can't read another member's bookings.

## Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) project
- (For deployment) accounts on Vercel/Netlify (frontend) and Render/Railway (backend)

## 1. Set up Supabase

1. Create a new Supabase project.
2. Open the SQL Editor and run `supabase/schema.sql` in full.
3. Optionally run `supabase/seed.sql` for a couple of extra demo donations/campaigns.
4. Under **Project Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**backend only — never
     put this in the frontend or commit it**)
5. Under **Authentication → Providers**, confirm Email is enabled and (for a
   real deployment) that "Confirm email" is turned on, matching the brief's
   email-verification requirement.
6. Sign up through the running app once, then promote yourself to admin:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-auth-uid>';
   ```
   (Find your uid under Authentication → Users.)

## 2. Run the backend

```bash
cd backend
cp .env.example .env      # fill in the three SUPABASE_* values
npm install
npm run dev                # http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

## 3. Run the frontend

```bash
cd frontend
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev                   # http://localhost:5173
```

## Environment variables

**backend/.env**
| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `4000`) |
| `NODE_ENV` | `development` \| `production` |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — **secret, server-only** |

**frontend/.env.local**
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Same anon key (safe for the browser — RLS protects the data) |
| `VITE_API_BASE_URL` | Where the backend is running, e.g. `http://localhost:4000/api` |

## Type safety

`shared/api-types.ts` is the single source of truth for every API request/
response shape and DB row shape. It's copied by hand into `backend/src/types/index.ts`
and `frontend/src/types/index.ts` rather than imported across a package
boundary, so neither build needs a monorepo/workspace setup for this project's
scope. **Rule: change `shared/api-types.ts` first, then copy it into both
apps.** If this project grows past a student/portfolio scope, promote it into
an npm workspace package (`packages/shared`) and import it properly — no
type changes would be needed, just the wiring.

## Deployment

- **Frontend** → Vercel or Netlify. Build command `npm run build`, output
  dir `dist`, set the three `VITE_*` env vars in the dashboard.
- **Backend** → Render or Railway. Build command `npm run build`, start
  command `npm start`, set the four backend env vars (including
  `CORS_ORIGIN` pointed at your deployed frontend URL).
- **Database** → Supabase is already managed/hosted; nothing to deploy.

## Testing the double-booking guard

The brief requires conflict prevention enforced at the DB/API level, not
just the UI. To verify:
1. As a member, request a booking for Room A, 10:00–11:00 tomorrow.
2. As staff, approve it.
3. As any member, try to request Room A, 10:30–11:30 tomorrow.
4. The API returns `409 Conflict` — this is a Postgres exclusion constraint
   (`no_overlapping_bookings` in `schema.sql`), so it holds even under
   concurrent requests, not just sequential ones.

## Known limitations / stretch goals not implemented

See `docs/HANDOVER.md` and the brief's Section 10 — no real payment gateway,
no real recurring billing (pledges are logged as intent), no waitlist queue,
no automated email reminders. These are documented, not hidden.
