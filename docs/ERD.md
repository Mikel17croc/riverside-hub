# Entity Relationship Diagram

Renders as a diagram on GitHub, or paste into https://mermaid.live to view.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "has one"
    PROFILES ||--o{ BOOKINGS : "makes"
    PROFILES ||--o{ DONATIONS : "makes (optional)"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    RESOURCES ||--o{ BOOKINGS : "is booked in"
    CAMPAIGNS ||--o{ DONATIONS : "receives"

    AUTH_USERS {
        uuid id PK
        text email
    }

    PROFILES {
        uuid id PK "references auth.users(id)"
        text full_name
        text phone
        enum role "member | staff | admin"
        enum membership_tier "free | standard | family"
        timestamptz joined_at
        timestamptz membership_expires_at
    }

    RESOURCES {
        uuid id PK
        text name
        enum type "room | equipment"
        text category
        int capacity
        text description
        boolean active
    }

    BOOKINGS {
        uuid id PK
        uuid resource_id FK
        uuid member_id FK
        timestamptz start_time
        timestamptz end_time
        enum status "pending | approved | rejected | cancelled"
        text notes
    }

    CAMPAIGNS {
        uuid id PK
        text title
        text description
        numeric goal_amount
        numeric current_amount
        boolean active
    }

    DONATIONS {
        uuid id PK
        uuid donor_id FK "nullable - anonymous"
        text donor_name
        text donor_email
        numeric amount
        enum type "one_off | recurring_pledge"
        uuid campaign_id FK
        text message
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text message
        boolean read
    }
```

## Notes on key design decisions

- **`profiles.id` is a foreign key to `auth.users.id`**, not an independent
  primary key — this is the standard Supabase pattern. A trigger
  (`handle_new_user`) creates the profile row automatically on signup, so the
  app never has to do it manually.
- **`bookings` has a database-level exclusion constraint** (not shown in the
  ER diagram's cardinality, since it's a constraint rather than a
  relationship) preventing two `approved` bookings from overlapping on the
  same resource — this is what makes double-booking prevention race-safe
  rather than just a UI check.
- **`donations.donor_id` is nullable** to support anonymous donations, with
  `donor_name`/`donor_email` captured as free text instead when there's no
  account.
- **`campaigns.current_amount` is derived**, kept in sync by a trigger that
  fires on every donation insert — the frontend never has to sum donations
  itself.
