# Roshlíngua — Rebuild Blueprint

A comprehensive technical and UX blueprint to rebuild Roshlíngua from the ground up. This document is designed for engineers, designers, product managers, and QA to align on scope, architecture, and implementation details.

Last updated: 2025-09-11 15:48 (IST)

---

## 1) Project Overview

- Mission
  - Help people learn languages through structured modules, interactive content, and meaningful conversations with AI and peers.
- Product Pillars
  - Personalized learning
  - Social and AI-assisted practice
  - Clear progress visibility and motivation loops
  - Seamless, fast, and reliable experience
- Target Platforms
  - Web (responsive, PWA-ready)
  - Future: Mobile (React Native or Capacitor)
- Tech Stack (recommended)
  - Frontend: React + TypeScript + Vite, Tailwind CSS, Radix UI or Shadcn UI components
  - State/Query: React Query (TanStack) + Zustand or Redux Toolkit for UI state
  - Internationalization: i18next (already present in repo under `src/i18n/`)
  - Backend: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions)
  - AI: OpenAI/Anthropic/Azure OpenAI via server-side Edge Function
  - Notifications: Web Push (VAPID) via Edge Functions + Supabase tables
  - Analytics: PostHog/Amplitude; logging with Sentry

---

## 2) User Personas

- Learner (Primary)
  - Goals: Structured lessons, practice with AI, track progress, stay motivated
  - Pain points: Overwhelm, need for guidance, inconsistent practice
- Community-Oriented Learner
  - Goals: Practice with peers, join communities, participate in challenges
  - Pain points: Dead communities, poor moderation
- Power User / Polyglot
  - Goals: Advanced content, custom drills, streak/XP optimization
  - Pain points: Feature limits, lack of API/exports
- Moderator/Admin
  - Goals: Manage content, community, and abuse reports
  - Pain points: Poor tooling, manual work

---

## 3) Features List

- Authentication & Accounts
  - Email/password + OAuth (Google, GitHub, Apple)
  - Profile setup (username, avatar, native language, learning languages)
- Learning
  - Modules → Lessons → Activities (quizzes, listening, speaking, flashcards)
  - Spaced repetition for vocabulary
  - Placement test and adaptive difficulty
- Chat
  - AI chat (topic prompts, role-play, corrective feedback)
  - Peer chat (1:1 and group), presence indicators, typing, read receipts
  - Media attachments (images/audio), transliteration, translation hints
- Progress & Motivation
  - XP, streaks, badges/achievements, leaderboards
  - Progress graphs by module/skill
- Notifications
  - Lesson reminders, streak alerts, community mentions, system updates
  - Web push + in-app notifications center
- Community
  - Posts, comments, reactions, moderation tools, reporting
- Settings
  - Language, theme, notifications, privacy, data export/delete
- Admin
  - Content management for modules/lessons
  - User management, reports, abuse moderation

---

## 4) Pages with Routes

- Public
  - `/` — Landing
  - `/auth/login` — Login
  - `/auth/register` — Register
  - `/auth/callback` — OAuth callback
  - `/legal/terms`, `/legal/privacy`
- Authenticated
  - `/dashboard` — Overview (XP, streak, quick actions)
  - `/learn` — Modules catalog
  - `/learn/:moduleId` — Module detail
  - `/learn/:moduleId/lesson/:lessonId` — Lesson player
  - `/review` — SRS review queue
  - `/chat` — Chat home (AI + people tabs)
  - `/chat/ai` — AI assistant
  - `/chat/thread/:threadId` — 1:1 or group thread
  - `/community` — Feed
  - `/community/post/:postId` — Post detail
  - `/profile/:username` — User profile
  - `/settings` — User settings
  - `/notifications` — Notification center
  - `/achievements` — Badges & milestones
- Admin (role=admin)
  - `/admin` — Overview
  - `/admin/content` — Manage modules/lessons
  - `/admin/users` — Manage users
  - `/admin/reports` — Abuse reports

Navigation Structure (example)
- Top nav: Home, Learn, Chat, Community, Notifications, Profile
- Secondary nav (within Learn): Modules, Review, Achievements

---

## 5) UI Design Guidelines

- Colors (Tailwind tokens)
  - Primary: `#2563EB` (blue-600)
  - Secondary: `#10B981` (emerald-500)
  - Accent: `#F59E0B` (amber-500)
  - Background: light `#0B1220` text on `#F8FAFC` (slate-50); dark mode inverse
  - Semantic: success `#22C55E`, error `#EF4444`, warning `#F59E0B`, info `#3B82F6`
- Typography
  - Headings: Inter or SF Pro Display, bold
  - Body: Inter, 14–16px base, comfortable line-height
  - Code/mono: JetBrains Mono (developer pages only)
- Layout & Spacing
  - 8px spacing scale
  - Container width: 1200px max, 16px gutters on mobile
- Components
  - Use Shadcn/Radix primitives for accessibility (dialogs, toasts, dropdowns)
  - Buttons: primary, secondary, ghost, destructive
  - Cards for lessons/modules, list items for chat threads
- Icons
  - Set: Lucide or Heroicons (outline for default, solid for emphasis)
  - App icons in `public/icons/` (e.g., `chat-icon.png`, `dashboard-icon.png`)
- Motion
  - Prefer subtle transitions (150–250ms, ease-out)
- Accessibility
  - Color contrast AA minimum
  - Keyboard navigable, focus-visible styles
  - ARIA labels for interactive controls

---

## 6) Data Models & Database Structure (Supabase Postgres)

Core Entities
- `auth.users` — Supabase managed
- `public.profiles`
  - id (uuid, PK, references auth.users)
  - username (text, unique)
  - display_name (text)
  - avatar_url (text)
  - native_language (text)
  - learning_languages (text[])
  - bio (text)
  - role (enum: user, moderator, admin)
  - created_at (timestamptz)
- Learning
  - `modules` (id, slug, title, level, language, description, cover_url, is_published)
  - `lessons` (id, module_id FK, title, order_index, duration_sec, is_published)
  - `activities` (id, lesson_id FK, type enum: quiz|listen|speak|flashcard|dialog, payload jsonb)
  - `enrollments` (user_id FK, module_id FK, started_at, completed_at)
  - `progress` (user_id, lesson_id, score, attempts, completed_at, srs_due_at)
  - `vocabulary` (id, language, term, translation, ipa, examples jsonb, tags text[])
  - `user_vocab` (user_id, vocab_id, ease, interval, due_at, last_answer)
- Chat & Social
  - `chat_threads` (id, type enum: ai|dm|group, title, created_by)
  - `chat_participants` (thread_id, user_id, role: owner|member)
  - `chat_messages` (id, thread_id, sender_id nullable for AI, content, content_type enum: text|image|audio|system, metadata jsonb, created_at)
  - `message_reactions` (message_id, user_id, emoji)
  - `friendships` (user_id, friend_id, status enum: pending|accepted|blocked)
  - `posts` (id, author_id, body, media_urls text[], created_at)
  - `comments` (id, post_id, author_id, body, created_at)
  - `reactions` (id, subject_type enum: post|comment, subject_id, user_id, emoji)
- Gamification
  - `achievements` (id, key unique, name, description, icon, criteria jsonb)
  - `user_achievements` (user_id, achievement_id, earned_at)
  - `xp_events` (id, user_id, amount, reason, context jsonb, created_at)
- Notifications
  - `notifications` (id, user_id, type, payload jsonb, read_at, created_at)
  - `push_subscriptions` (id, user_id, endpoint, p256dh, auth, user_agent, created_at)
- Settings & Audit
  - `user_settings` (user_id, theme, locale, email_opt_in, push_opt_in)
  - `audit_logs` (id, actor_id, action, target_type, target_id, metadata jsonb, created_at)

Indexes & Constraints
- Unique: `profiles.username`, `achievements.key`
- Composite: `(user_id, lesson_id)` on `progress`, `(user_id, vocab_id)` on `user_vocab`
- GIN indexes on jsonb fields used in queries (e.g., `activities.payload`)

Row Level Security (RLS) Examples
```sql
-- profiles: users can read all (limited fields), update self
create policy "profiles_select_public" on profiles for select using (true);
create policy "profiles_update_self" on profiles for update
  using (auth.uid() = id);

-- chat_messages: thread participants only
create policy "chat_read" on chat_messages for select using (
  exists(select 1 from chat_participants cp where cp.thread_id = chat_messages.thread_id and cp.user_id = auth.uid())
);
create policy "chat_insert" on chat_messages for insert with check (
  exists(select 1 from chat_participants cp where cp.thread_id = chat_messages.thread_id and cp.user_id = auth.uid())
);
```

Storage Buckets
- `avatars` (public read, authenticated write-self)
- `lesson-assets` (images/audio; public read if lesson published)
- `chat-media` (private; signed URLs for participants)

TypeScript Types (example)
```ts
export type Profile = {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
  native_language?: string
  learning_languages?: string[]
  role: 'user' | 'moderator' | 'admin'
}
```

---

## 7) API & Backend Architecture

Overview
- Use Supabase for primary data plane (Postgres + RLS). Use Edge Functions for privileged server-side logic (AI calls, webhooks, scheduled jobs).
- Keep client minimal and use RPC for complex operations when necessary.

Authentication
- Supabase Auth with email/password and OAuth (Google, GitHub, Apple)
- Post-signup profile row creation via trigger
```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Chat Service
- Thread types: `ai`, `dm`, `group`
- Realtime: subscribe to `chat_messages` via Supabase Realtime; channel key per `thread_id`
- Typing indicators: ephemeral presence in Realtime (broadcast events)
- Read receipts: `chat_participants.last_read_message_id`
- AI Chat Flow
  1. Client calls Edge Function `/ai-chat` with `thread_id` and last N messages
  2. Function performs moderation, system prompt, calls LLM (OpenAI/Anthropic), streams tokens back
  3. Function inserts assistant message into `chat_messages` with `content_type='text'`
  4. Client displays streamed response

Notifications
- In-app: `notifications` table + Realtime
- Push: store VAPID keys on server; Edge Function `/push/send` to send web push (e.g., with `web-push` lib)
- Examples: mention in comment, lesson reminder, streak broken, admin announcements

REST/RPC Examples
- RPC for progressing a lesson step
```sql
create function public.complete_activity(p_lesson_id uuid, p_score int)
returns void as $$
begin
  insert into progress (user_id, lesson_id, score, attempts, completed_at)
  values (auth.uid(), p_lesson_id, p_score, 1, now())
  on conflict (user_id, lesson_id)
  do update set score = greatest(progress.score, excluded.score),
                attempts = progress.attempts + 1,
                completed_at = now();
end;
$$ language plpgsql security definer;
```

Edge Functions (examples)
- `/ai-chat` — LLM gateway with safety + cost logging
- `/push/subscribe` — Validates and stores push subscription
- `/push/send` — Sends a push to a user or topic
- `/webhooks/supabase` — DB change events for analytics or downstream sync
- `/scheduled/daily-reminders` — Cron for reminders/streaks using Supabase Scheduled Functions

Security
- Apply RLS on all tables in `public`
- Never expose provider API keys to client; keep in Edge Functions env
- Rate-limit sensitive endpoints (chat, posting, login attempts)
- Content moderation for user-generated content (heuristics + provider APIs)

---

## 8) Integrations

- Supabase
  - Auth, Database, Realtime, Storage, Edge Functions
  - Migrations tracked in `migrations/` with SQL files
- AI Providers
  - OpenAI/Anthropic/Azure OpenAI; use server-side only
  - Model suggestions: GPT-4o-mini for cost-effective chat; consider streaming
- Translation/Dictionary (optional)
  - DeepL/Google Translate for hints; maintain caching layer
- Analytics & Quality
  - PostHog/Amplitude for product analytics
  - Sentry for error monitoring
- Payments (future)
  - Stripe for subscriptions and in-app purchases

---

## 9) Potential Problems & Solutions

- Data Consistency in Realtime
  - Solution: optimistic updates with reconciliation on server ack; idempotent message inserts
- Abuse & Safety in Chat
  - Solution: moderation endpoints, report flows, block lists, rate-limits, keyword filters
- Performance on Low-End Devices
  - Solution: virtualized lists for chat/feed, code-splitting routes, image compression
- Vendor Lock-in
  - Solution: keep domain models provider-agnostic; abstract storage and chat provider interfaces
- Lost Sessions / Auth Edge Cases
  - Solution: token refresh on app load, handle `onAuthStateChange`, robust retry/backoff
- RLS Complexity
  - Solution: keep policies simple, write integration tests per table + role

---

## 10) Future Enhancements

- Speaking practice with real-time feedback (WebRTC + server scoring)
- Challenge modes and weekly events
- Community classrooms and group calls
- Marketplace for user-created modules
- Offline mode (PWA) for lessons and reviews
- Export/import user data; public API for power users

---

## 11) Implementation Plan (High-Level)

- Phase 0 — Foundations (Week 1)
  - Project scaffolding, auth setup, profiles, RLS baseline
  - Design tokens, component library, layout & navigation
- Phase 1 — Learn Core (Weeks 2–3)
  - Modules/lessons/activities CRUD (admin), player, progress tracking
  - SRS queue and minimal vocab model
- Phase 2 — Chat (Weeks 4–5)
  - Realtime chat (DM/group), AI chat Edge Function + streaming UI
  - Typing indicators, read receipts, media upload
- Phase 3 — Notifications & Gamification (Week 6)
  - In-app + push notifications, achievements, XP, streak logic
- Phase 4 — Community (Week 7)
  - Posts, comments, reactions, moderation tools
- Phase 5 — Polish & QA (Week 8)
  - Performance, accessibility, cross-browser, analytics, error logging

---

## 12) Example Component & Folder Structure

```
src/
  components/
    auth/
    chat/
    learn/
    layouts/
    ui/
  hooks/
  pages/
    auth/
    dashboard/
    learn/
    chat/
    community/
    profile/
    settings/
  i18n/
  lib/
    supabase.ts
    api/
      chat.ts
      learn.ts
      notifications.ts
  styles/
  types/
  app.tsx
```

---

## 13) QA & Testing Strategy

- Unit: pure functions (SRS scheduler, XP calculator)
- Integration: RLS policies (test per table), RPC functions, Edge Functions
- E2E: Playwright/Cypress for auth, learn flow, chat, notifications
- Load Tests: Chat throughput, notifications fanout, AI rate-limits

---

## 14) Environment & Configuration

- Required env (client)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Required env (server/Edge)
  - `SUPABASE_SERVICE_ROLE_KEY` (do not expose to client)
  - `OPENAI_API_KEY` (or provider equivalents)
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Build & Deploy
  - Vercel/Netlify for frontend
  - Supabase for DB and Edge Functions
  - Use migration scripts in `migrations/`

---

## 15) Definition of Done (DoD)

- All routes navigable and responsive
- Auth works across email + at least one OAuth provider
- Learn module playable end-to-end with progress saved
- AI and peer chat operational with realtime updates
- Notifications center functions; push deliverable in at least one browser
- Basic analytics and error capture wired
- Accessibility checks pass (axe)
- Documentation updated and handover notes included

---

## 16) Security & Privacy

- Principles
  - Least privilege, defense-in-depth, privacy by design, secure defaults.
  - All secrets server-side; never expose provider keys in client code.
- Authentication & Session
  - Supabase Auth (email/OAuth). Enforce email verification.
  - Enable PKCE for OAuth flows; rotate refresh tokens on use.
  - Session persistence: short-lived access tokens, sliding refresh.
- Authorization
  - Row Level Security (RLS) on all tables in `public`.
  - Use Postgres roles for admin Edge Functions when necessary; never rely on client to assert roles.
- Data Protection
  - PII in `profiles`: collect minimum viable; allow user deletion/export.
  - Encrypt at rest (Supabase/PG). TLS 1.2+ in transit.
  - Signed URLs for `chat-media`; time-bound (e.g., 15 minutes).
- Secrets Management
  - Store secrets in Supabase Edge Function env or deployment provider secrets.
  - Rotate keys quarterly and upon suspected leak.
- Rate Limiting & Abuse Prevention
  - Per-IP and per-user limits on chat sends, post creates, login attempts.
  - Captcha challenge on suspicious behavior.
  - Content moderation: provider API + heuristic filters; quarantine queue for review.
- Audit & Compliance
  - `audit_logs` table for admin actions and sensitive operations.
  - Data retention policy: configurable TTL for logs and soft-deleted data.
- Example: Rate-limiting in Edge Function (TypeScript)
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { KVNamespace } from 'worktop/kv' // example; use platform KV or DB

export default async function rateLimit(key: string, limit = 30, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000)
  const bucket = `${key}:${Math.floor(now / windowSec)}`
  const count = (await KVNamespace.get(bucket)) ?? 0
  if (Number(count) >= limit) throw new Error('rate_limit_exceeded')
  await KVNamespace.put(bucket, String(Number(count) + 1), { expirationTtl: windowSec })
}
```

---

## 17) Observability & Monitoring

- Metrics
  - App: FCP/LCP/CLS (Web Vitals), API latency, error rate, cache hit rate.
  - Product: DAU/WAU/MAU, lesson completion rate, chat engagement, retention.
- Logging
  - Client: structured logs with user/session IDs (hashed anonymized).
  - Server (Edge Functions): request IDs, timing, external API cost and latency.
  - Use Sentry for error reporting with source maps; PII scrubbing enabled.
- Tracing
  - Attach `x-request-id` across client → Edge Function → DB (via `SET LOCAL application_name`).
- Dashboards & Alerts
  - PostHog/Amplitude dashboards for funnels and retention.
  - Sentry alerts: release regression, error rate spike, chat failures.
- Example: Sentry init (frontend)
```ts
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

---

## 18) Performance & Reliability

- Frontend
  - Code splitting by route; lazy-load heavy chat and community modules.
  - Virtualized lists for chat threads/messages (e.g., `react-virtuoso`).
  - Image optimization: responsive sizes, `loading="lazy"`, WebP/AVIF.
  - Memoize with React Query caching; aggressive staleTime for read-mostly data.
- Backend
  - Index critical queries (`progress`, `user_vocab`, `chat_messages(thread_id, created_at)`).
  - Use pagination + keyset pagination for chat (by `created_at, id`).
  - Apply backpressure on AI streaming; circuit-breaker on provider failure.
- Reliability
  - Idempotency keys for message sends and activity completion.
  - Retries with exponential backoff and jitter; DLQ for failed jobs (if using a queue).

---

## 19) CI/CD & Deployment Pipelines

- Branching
  - `main` (stable), `develop` (integration), feature branches.
- Checks
  - Lint (ESLint), typecheck (tsc), tests (unit + integration), build, bundle size guard.
- Environments
  - `dev` → preview deployments; `staging` → pre-prod; `prod` → live.
- Database Migrations
  - All changes via SQL files in `migrations/`; use timestamped filenames.
  - Apply in staging first; generate DB schema snapshot for diff.
- Example: GitHub Actions (simplified)
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm test -- --ci
      - run: npm run build
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy:frontend # e.g., Vercel/Netlify CLI
```

---

## 20) Documentation Standards

- Repo Docs
  - `README.md` high-level; `docs/` for deeper guides.
  - Architecture Decision Records in `docs/adr/` (adr-YYYYMMDD-title.md).
- Code Docs
  - TSDoc/JSDoc for public functions; storybook docs for UI components (optional).
  - Inline examples for complex hooks and API clients in `src/lib/api/`.
- Runbooks
  - Incident response (chat down, auth outage), rollback steps, on-call handbook.
- Changelog
  - Keep `CHANGELOG.md` with Conventional Commits.

---

## 21) Accessibility (A11y)

- Standards
  - WCAG 2.1 AA; semantic HTML; ARIA only when necessary.
- Testing
  - Automated: axe-core in CI; manual keyboard-only walkthroughs.
  - Screen reader spot checks (NVDA/VoiceOver) on nav, chat, lesson player.
- Patterns
  - `focus-visible` styling, skip-to-content link, live regions for chat updates.
  - Provide captions/transcripts for audio/video lessons.

---

## 22) Legal & Compliance

- Policies
  - Terms of Service, Privacy Policy, Community Guidelines at `/legal/*`.
- Data Protection
  - GDPR alignment: DPIA for AI processing, data export/delete endpoints.
  - Age restrictions and parental consent where applicable.
- Content
  - Copyright handling for lesson assets; maintain licenses inventory.
- Cookies & Tracking
  - Cookie banner for analytics if jurisdiction requires; honor DNT.

---

## 23) Scalability & Multi-tenancy

- Database
  - Partition large tables (`chat_messages`) by time if needed.
  - Use read replicas for analytics workloads.
- Services
  - Horizontal scale Edge Functions; use global CDN for assets.
- Architecture
  - Abstract chat and translation providers; feature flags for gradual rollout.

---

## 24) Environment Variables Reference (Extended)

- Client
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SENTRY_DSN` (optional)
- Server / Edge Functions
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `AZURE_OPENAI_*`
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
  - `POSTHOG_API_KEY` / `AMPLITUDE_API_KEY`
  - `STRIPE_SECRET` (future)
  - `RATE_LIMIT_*` (configurable limits)

---

## 25) Additional API Examples

- Edge Function: AI Chat (pseudo)
```ts
import { OpenAI } from 'openai'

export async function onRequest(req: Request) {
  const { thread_id, messages } = await req.json()
  // 1) Authn/z checks, 2) moderation, 3) system prompt
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages,
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

- Client: Supabase Realtime subscription for messages
```ts
const channel = supabase
  .channel(`thread:${threadId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
    queryClient.setQueryData(['messages', threadId], (prev: any[] = []) => [...prev, payload.new])
  })
  .subscribe()
```

---

## 26) Iconography & Assets

- Icon set: Lucide/Heroicons. Keep consistent sizes (20/24 px) and stroke weight.
- Asset pipeline: place in `public/icons/` and `public/images/`; optimize using `svgo`.
- App favicon/app icons for PWA; ensure `manifest.json` updated.

---

## 27) Glossary

- AI Chat: Conversations with LLM via Edge Function; not directly from client.
- SRS: Spaced Repetition System for vocabulary review.
- RLS: Row Level Security policies in Postgres controlling per-row access.

