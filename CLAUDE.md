# VolleySmart App

For completed work history, see [HISTORY.md](./HISTORY.md).

## Current status
- Last change: `feat/native-app-phase-0` merged to main (shared core + opponent mode + club locations)
- Supabase Dashboard configured: custom SMTP (Resend), auth email templates pasted
- Note: `send-club-invitations` edge function is deployed but unused. Frontend uses link-based invite flow. Can be deleted or repurposed.
- Deploy status: `notify-join-request` edge function needs deploying

## Architecture
- `packages/core/` — shared async data functions, types, i18n, utils (no React hooks, no platform-specific code)
- `apps/web/` — React + Vite, React Query hooks, web UI components
- `apps/mobile/` — Expo 54 + React Native 0.81.5, separate UI (Phase 1+)
- Both apps call `setSupabaseClient()` at boot with platform-appropriate storage
- Client injection: `setSupabaseClient`/`getSupabaseClient` in `packages/core/src/supabase/clientHolder.ts`

## i18n notes (not translated, DB-driven content)
- **FAQs**: Content from Supabase `faqs` table. Would need translated columns in DB
- **Notification body text**: Dynamic server-generated strings like "Isabel is attending XXX Event"
- **Position data values**: DB stores English names; only display is translated client-side

## Pending DB migrations
- `20260422000010_repair_notification_triggers.sql` — idempotent repair of triggers
- `20260426000008_discoverable_club_member_count.sql` — RPC get_club_member_count for non-member visibility
- `20260505000001_fix_delete_own_account.sql` — NULLs FK references before auth user deletion, makes clubs.created_by nullable

## Pending deploy items
- Phase 14 item: Repair migration 000010 (idempotent re-apply of all notification triggers)
- Discovery migrations: 20260426000004 (fix request_join_club), 20260426000005 (location created_by)

## Key files
- `apps/web/src/pages/ClubOverview.tsx` — Club overview page
- `apps/web/src/pages/CreateEvent.tsx` — 3-step event creation with success dialog
- `apps/web/src/pages/EventDetail.tsx` — Event detail page with RSVP, attendees, delete, edit sheet
- `apps/web/src/pages/UpcomingEvents.tsx` — Home tab (upcoming + past events, filters, month filter)
- `apps/web/src/pages/Game.tsx` — Unified game page (/game/:matchDayId). Teams, scores, actions
- `apps/web/src/pages/Profile.tsx` — Volleyball tab stats section with club filter
- `apps/web/src/pages/Notifications.tsx` — Notifications list page
- `apps/web/src/pages/LiveScore.tsx` — Live Score Tracker (courtside tap-to-score, forced landscape)
- `apps/web/src/pages/HomeDashboard.tsx` — Home dashboard with sliders + discover events
- `apps/web/src/pages/MembersGlobal.tsx` — Global members page (across all user's clubs)
- `apps/web/src/components/events/EventCard.tsx` — Event card with today highlight + RSVP status
- `apps/web/src/components/clubs/ClubSettingsDialog.tsx` — Club settings bottom sheet (admin)
- `apps/web/src/components/forms/EventLocationSelector.tsx` — Two-field location picker (name + address with Mapbox)
- `apps/web/src/components/nav/MobileChrome.tsx` — Route-based navbar visibility
- `apps/web/src/components/common/RealtimeAppEffect.tsx` — Realtime subscriptions (notifications, etc.)
- `apps/web/src/hooks/useCurrentPlayerId.ts` — Shared hook for current user's player ID
- `apps/web/src/hooks/usePremium.ts` — Premium status hook (early adopter + super-admin)
- `apps/web/src/routes/AppRoutes.tsx` — All routes
- `apps/web/src/i18n/index.ts` — i18next init + config
- `apps/web/src/i18n/locales/{en,es,de}/*.json` — 10 namespace files x 3 languages
- `packages/core/src/index.ts` — barrel export
- `packages/core/src/supabase/*.ts` — 17 data modules
- `packages/core/src/i18n/index.ts` — translations aggregator

## Feature backlog

### Group A: Chat & Communication
- **FEAT-20: Chat Architecture** — Audit and propose architecture for a shared chat system covering both club chat (entry: Club Details) and event chat (entry: Event Details). Same component, different room scope. Cover data model, RLS, and Realtime approach. No implementation.
- **FEAT-34: Email Notification Templates** — DB notification triggers exist but no emails are sent. Create email templates (Supabase Edge Functions or Resend/Postmark) for all 9 notification types. Test delivery end-to-end.

### Group B: Event & Game Enhancements
- **FEAT-21: Event Image Suggestions** — Suggest volleyball-related images when creating an event.
- **FEAT-22: Edit Guests from Club Details** — Add admin-only "Edit Guests" button on Club Details.
- **Phase 15: Advanced Filters** — Custom month range, filter by city.

### Group C: Analytics & Stats
- **OPEN-Q-01: Analytics Design Doc** — Propose additional analytics (personal and club) that would add value. Output as a design doc, no implementation.

### Group D: Business & Premium
- **FEAT-25: Paid Tiers Architecture** — Audit and propose paid-tier architecture. Free-tier limits: max 2 clubs/user, max 20 members + 5 guests/club. Suggest schema, enforcement, payment provider.
- **FEAT-37: Per-Club Subscription** — Club-level premium subscription that unlocks analytics for all club members. Deferred: per-user subscription is simpler to start.
- **FEAT-38: Premium. City Switching for Public Events** — Free users see public events in their home city only. Premium users can browse any city.
- **FEAT-39: Premium. Advanced Analytics** — Win streaks, head-to-head records, performance by position, monthly trend charts, player comparison.
- **FEAT-40: Premium. Data Export** — Export game history and personal/club stats as CSV or PDF.
- **FEAT-41: Premium. Custom Team Pairings** — Lock specific player pairings/groups during team generation. Overlaps with FEAT-35 but gated behind premium.
- **FEAT-42: Premium. Extended Game History** — Free users see last 10 games; premium users see full history.
- **FEAT-43: Premium. Priority Support** — Premium users get faster response times on contact form.

### Group E: Platform
- **Native iOS/Android app** — Phase 0 (shared core) done. Phase 1 next: auth + onboarding in Expo.
- **Tournament event type** — Complex, deferred.
- **Push notifications (native app)** — Requires native app build. notification_preferences table already has `push` column ready.

### Group F: Discovery extensions
- Distance filter (PostGIS), country filter, category/sport filter.

### Group G: Team Management
- **FEAT-35: Admin Team Pairing** — New "Teams" button on ClubOverview. Admin can create persistent player pairings/groups. Needs DB model + integration with `assignTeams()`.
- **FEAT-36: Review Best Team Combinations Algorithm** — Audit current logic in `clubStats.ts`. Consider alternative ranking (win rate with minimum threshold, point differential, weighted scoring).
