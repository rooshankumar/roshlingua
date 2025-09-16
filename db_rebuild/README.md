# Roshlíngua DB Rebuild

This folder contains a complete database rebuild for the app using Supabase Postgres. It includes schema, indexes, RLS policies, and core functions/triggers to get the app working again.

## Files and order

1. `00_schema.sql`
   - Enums and all core tables (profiles, learning, chat, social, gamification, notifications, settings, audit, onboarding).
2. `01_indexes.sql`
   - Important unique and performance indexes.
3. `02_rls.sql`
   - Row Level Security enabled on all tables and core policies.
4. `03_functions.sql`
   - Functions and triggers (new user bootstrap, profile upsert, streak updates, XP helpers, notifications helper).

Run these in strictly ascending order.

## How to apply

Option A — Supabase SQL Editor
- Open your Supabase project → SQL → New Query.
- Paste and run each file content in order: `00_schema.sql`, `01_indexes.sql`, `02_rls.sql`, `03_functions.sql`.

Option B — Supabase CLI
- Ensure you have Supabase CLI installed and logged in.
- From the repo root, run (Windows PowerShell):
  - `supabase db execute -f .\db_rebuild\00_schema.sql`
  - `supabase db execute -f .\db_rebuild\01_indexes.sql`
  - `supabase db execute -f .\db_rebuild\02_rls.sql`
  - `supabase db execute -f .\db_rebuild\03_functions.sql`

## Notes

- This rebuild follows the latest "Rebuild Blueprint" (`ROSHLINGUA_REBUILD_BLUEPRINT.md`) domain model using:
  - `chat_threads`, `chat_participants`, `chat_messages` instead of legacy `conversations`/`messages` tables.
- If your current frontend still queries legacy tables (`public.messages`, `public.conversations`, `public.conversation_participants`), let me know and I can add compatibility views or migrate the frontend queries.
- The `profiles` table now includes: `email`, `last_seen`, `streak_count`, and `xp_points` to support streak and XP features, and it is auto-populated by the `handle_new_user` trigger on `auth.users`.
- Storage buckets are not created here; create those in Supabase Storage (e.g., `avatars`, `lesson-assets`, `chat-media`) as needed.

## Next steps (optional)

- Seed minimal data (modules/lessons) to verify the Learn flow.
- Add admin-only RLS policies or Postgres roles to manage content safely.
- Add compatibility views for any legacy table names your app expects.
- Create storage buckets and policies for client upload flows.
