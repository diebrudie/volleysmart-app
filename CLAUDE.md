# VolleySmart App

For completed work history, see [HISTORY.md](./HISTORY.md).

## Current status
- In progress: `feat/mobile-phase3-parity` (branched off phase 2, NOT main) — native app Phase 3: PWA feature parity for everything except the game layer. Built via multi-agent workflows (foundation → 10 work packages → integration). Committed + pushed. Verified by driving the Expo-web build in Playwright (Events, Clubs, Members/invites, Home, Notifications, Profile all pass); 3 bugs found+fixed (share clipboard crash, club-delete nested modal, filter-select nested modal). NOT merged yet — awaiting user's on-device test via Expo Go. Device checklist at `apps/mobile/DEVICE_TEST_CHECKLIST.md`. Game layer (Game/LiveScore/EditGame/TeamGenerator/analytics) deliberately deferred to a follow-up run; mobile shows "web only" hints.
- Committed, PR pending: `feat/mobile-phase2-screens-rsvp` — Phase 2 native app: data hooks, tab screens, detail screens (Event/Club), RSVP, TopBar, FAB, MenuDrawer. Phase 3 builds on top of this branch.
- In progress (parallel): `feat/dynamic-og-images` — dynamic social preview images for shared event and club links (Cloudflare Pages function, resvg-wasm)
- Last merged: `feat/mobile-phase1-foundation-auth` (PR #106): native app Phase 1: providers, UI library, auth screens, tab layout, i18n, navy theme, logo.
- Mobile UI note: `apps/mobile` uses RN `Modal`-based `Sheet`/`Dialog` (NOT @gorhom/bottom-sheet) for react-native-web test compatibility. A Dialog/Select opened from INSIDE a Sheet must hide the parent Sheet (`visible={visible && !childOpen}`) or use inline chips — two stacked RN Modals leave the child unclickable on web.
- Mobile core change: `packages/core/src/supabase/types.ts` was regenerated (fixed 65 stale type errors) and `clubStats.ts` had a real query bug fixed (referenced nonexistent `players.primary_position`). These are shared with the PWA (logic/types only, no visual change). i18n locales only had keys ADDED, existing values unchanged.
- Previously merged: `feat/club-member-access-team-algorithm` (PR #105): club member access to games/scores/teams, team algorithm improvements, queer/flinta event gender
- Stashed: `stash@{0}` = incomplete "Share Club" button (ClubOverview + i18n). Restore with `git stash pop` on a dedicated branch.
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

## Recent DB migrations (applied)
- `20260514000001` — opponent team mode (is_opponent_mode, opponent_team_name on match_days)
- `20260514000002` — coach badge (is_coach on club_members)
- `20260515000001` — public event game and attendee visibility RLS
- `20260515000002` — event co-attendee visibility (broken, dropped in 20260516000001)
- `20260515000003` — RSVP'd attendees can view events after public-to-private
- `20260516000001` — drop co-attendee RLS policies, add SECURITY DEFINER helpers
- `20260516000002` — get_game_start_players RPC (replaces direct cross-table queries)
- `20260516000003` — fix game start and attendee visibility
- `20260516000004` — fix EditGame cross-club player access
- `20260516000005` — event location and club visibility
- `20260521000001` — add queer and flinta to event_gender enum
- `20260521000002` — fix get_game_start_players: club member access, positions JSONB with all positions
- `20260528000001` — sync game_players to event_rsvp (trigger + backfill) so edited/guest players show as event attendees

## Pending deploy items
- `notify-join-request` edge function needs deploying

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

### Group F: Discovery & Social
- Distance filter (PostGIS), country filter, category/sport filter.
- **FEAT-44: Club Friends** — Bidirectional club friendships (`club_friendships` table). New "friends" event visibility between private and public. Friend clubs see public profile only (image, name, description, location, join date), not members. Requires `is_public` boolean to become `visibility` enum ('private', 'friends', 'public') across 6 TS files + 10 SQL files. Detailed spec in memory file `project_club_friends_and_tournaments.md`. Premium feature candidate.
- **FEAT-45: Follow Clubs** — Unidirectional, no approval. `club_follows` table (user_id, club_id). Followers get notified on public event creation. No access to private data. Independent of Club Friends. Start with notifications only, add "Following" section on Clubs page later. Premium candidate.

### Group G: Team Management
- **FEAT-35: Admin Team Pairing** — New "Teams" button on ClubOverview. Admin can create persistent player pairings/groups. Needs DB model + integration with `assignTeams()`.
- **FEAT-36: Review Best Team Combinations Algorithm** — Audit current logic in `clubStats.ts`. Consider alternative ranking (win rate with minimum threshold, point differential, weighted scoring).
