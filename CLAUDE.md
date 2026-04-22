# VolleySmart App

## Current status
- Working on: Phase 14 — Notifications (in progress)
- Last change: Notifications system, share messages, bug fixes
- Current branch: `feat/notifications` (branched from `feat/phase-11-club-overview`)
- Next step: Apply repair migration 000010, verify notifications end-to-end, then merge branches to main

## Branching strategy
Branches stack on each other (not merged to main yet):
- `main` → `feat/phase-9-create-event-improvements` → `feat/phase-10-quick-fixes-polish` → `feat/phase-11-club-overview` → `feat/phase-12-game-flow-unification`
- `feat/notifications` branched from `feat/phase-11-club-overview`

## Phase 14 in-progress work (Notifications + Bug Fixes)
1. ~~**Notification triggers (DB)**~~: 9 types — join request/accepted/rejected, member joined, event created/cancelled, RSVP, RSVP deadline reminder (pg_cron), game started
2. ~~**Notification helpers**~~: `notify_club_members()` + `notify_club_admins()` SECURITY DEFINER functions
3. ~~**RPC rewrites**~~: `request_join_by_slug` (with re-request after rejection), `approve_membership`, `reject_membership` — all with notification inserts
4. ~~**Notifications page**~~: `/notifications` route, Game Details-style header, type-aware icons, relative timestamps, mark as read
5. ~~**Realtime subscription**~~: Live notification updates via Supabase channel in `RealtimeAppEffect.tsx`
6. ~~**Bell icon + badge**~~: Enabled in MobileTopBar + Navbar, red dot for unread count
7. ~~**Event cancellation**~~: "Cancel Event" option in EventDetail dropdown, `cancelPlannedEvent()` function
8. ~~**Share event messages**~~: Dynamic text based on game state (not started / in progress / past)
9. ~~**View Game button styling**~~: Home tab uses outline variant matching EventDetail
10. ~~**Guest dropdown direction**~~: Forced popover to open downward in GuestNameSelector
11. ~~**Manage Requests visibility**~~: Hidden for non-admin users on Members page
12. ~~**CreateEvent club dropdown**~~: All active members can see their clubs (was admin/editor only)
13. **Repair migration 000010**: Idempotent re-apply of all triggers — needs to be applied to DB
14. ~~**Logout redirect**~~: Now goes to `/login`
15. ~~**Toast durations**~~: Capped at 2000ms across all files
16. ~~**Block admin deletion**~~: Can't delete account if admin of club with 2+ members
17. ~~**Remove Tournament**~~: Removed from event creation flow

## Notifications key files
- `supabase/migrations/20260422000007_notification_triggers.sql` — triggers + RPC rewrites
- `supabase/migrations/20260422000008_rsvp_deadline_cron.sql` — pg_cron daily reminder
- `supabase/migrations/20260422000009_notifications_insert_policy.sql` — INSERT RLS policy
- `supabase/migrations/20260422000010_repair_notification_triggers.sql` — idempotent repair
- `apps/web/src/integrations/supabase/notifications.ts` — fetch, mark read, unread count
- `apps/web/src/pages/Notifications.tsx` — notifications list page
- `apps/web/src/components/common/RealtimeAppEffect.tsx` — realtime subscription

## Phase 12 in-progress work (Game Flow Unification)
1. **Unified `/game/:matchDayId` page**: New `Game.tsx` merges Dashboard + GameDetail — teams, SetBox scores, actions dropdown, edit scores table, location editing, delete, "New game w/ same teams"
2. **Start Game from EventDetail**: Creates match_day linked via `planned_event_id`, auto-generates teams from attending players using `assignTeams()`, navigates to `/game/:matchDayId`
3. **View Game button**: Once a game exists for an event, EventDetail shows "View Game" instead of "Start Game" (non-creators also see it)
4. **DB migration**: Unique partial index on `match_days.planned_event_id` prevents duplicate games per event
5. **Dashboard → redirect wrapper**: `/dashboard/:clubId` now redirects to `/game/:latestMatchDayId` or shows empty state
6. **Navigation updates**: All `/game-details/` links → `/game/`, all `/dashboard/` links → `/clubs/` or `/game/` as appropriate
7. **Files updated**: Archive, Games, UpcomingEvents, NewGame, EditGame, InviteMembers, NotFound, Navbar, App.tsx, AppRoutes.tsx
8. **Gradient hero + semantic styling**: Applied ClubOverview-style gradient header, back arrow, 3-dots dropdown, semantic color classes (bg-card, text-foreground, etc.)


## Phase 13 completed work (UI Consistency Pass)
1. ~~**Profile redesign**~~: Strava-style layout (avatar+name side by side, stats row, positions badges, edit mode toggle). Removed tabs/Card wrappers/font-serif.
2. ~~**Clubs page**~~: font-serif → font-bold, all gray-* → semantic (bg-card, bg-muted, text-foreground, border-border, bg-popover)
3. ~~**JoinClub page**~~: bg-gray-100 → bg-background, Card/popover gray → semantic
4. ~~**NewClub page**~~: bg-gray-100 → bg-background, upload area → semantic, card bg-white → bg-card
5. ~~**Members page**~~: font-serif → font-bold, Card border → border-border, view toggle → bg-muted, all gray text → text-muted-foreground
6. ~~**Game page polish**~~: Position shortening (O. Hitter, M. Blocker), back nav fix, RSVP ordering by responded_at

## Phase 11 completed work (Club Overview)
1. ~~**Club Overview page**~~: New `/clubs/:clubId` route with hero, club info, action buttons, upcoming event, members list
2. ~~**Members fetch fix**~~: Two separate queries (club_members + players) — no FK between tables, PostgREST can't join
3. ~~**Members button**~~: Scrolls to members section instead of navigating away
4. ~~**Admin member deletion**~~: Manage mode with checkboxes, bulk remove with confirmation dialog
5. ~~**Settings → bottom sheet**~~: Converted Dialog to Sheet, matches Edit Event styling (scrollable content, fixed bottom buttons)
6. ~~**Settings description field**~~: Added editable description with 200 char max + counter
7. ~~**Dynamic RSVP on EventCard**~~: Shows "You're going" / "You declined" / "RSVP by today" based on user's status
8. ~~**useCurrentPlayerId hook**~~: Shared hook replacing inline player queries in UpcomingEvents
9. ~~**Member cards**~~: Display name as "Isabel B.", primary position, Admin label top-right, sorted A→Z, not clickable
10. ~~**EventDetail back nav**~~: Uses navigate(-1) to return to previous page (Club Overview or Home)
11. ~~**Club info refinements**~~: "Club created in MMM. YYYY" label, MapPin icon for city

## Phase 10 completed work (Quick Fixes & Polish)
1. ~~**Today's event highlight**~~: EventCard shows primary border, tinted bg, "Today" badge on calendar + title
2. ~~**Location bug fix**~~: EventLocationSelector shows saved locations from ALL user's clubs when no club selected
3. ~~**Address mandatory for new locations**~~: Validation toast if address is empty for new location
4. ~~**Remove "Maybe" RSVP**~~: Removed from `RsvpStatus` type (already removed from filter UI)
5. ~~**Menu drawer cleanup**~~: Removed Profile, Settings, Discover Clubs, Start Tournament; kept Theme + FAQs + Logout
6. ~~**Description/Notes label**~~: Renamed to "Description / Notes (optional)" with 100 char max + counter
7. ~~**EventDetail notes display**~~: Own standalone section with bold heading, no border
8. ~~**Details section reorder**~~: Date → Location → Event type
9. ~~**Bottom bar fix**~~: Solid white/card background with z-50, content padding pb-32

## Phase 9 completed work
1-11. See git history on `feat/phase-9-create-event-improvements` branch

## Key files
- `apps/web/src/pages/ClubOverview.tsx` — Club overview page
- `apps/web/src/pages/CreateEvent.tsx` — 3-step event creation with success dialog
- `apps/web/src/pages/EventDetail.tsx` — Event detail page with RSVP, attendees, delete, edit sheet
- `apps/web/src/pages/UpcomingEvents.tsx` — Home tab (upcoming + past events, filters, month filter)
- `apps/web/src/components/events/EventCard.tsx` — Event card with today highlight + RSVP status
- `apps/web/src/components/clubs/ClubSettingsDialog.tsx` — Club settings bottom sheet (admin)
- `apps/web/src/hooks/useCurrentPlayerId.ts` — Shared hook for current user's player ID
- `apps/web/src/components/forms/EventLocationSelector.tsx` — two-field location picker (name + address with Mapbox)
- `apps/web/src/integrations/supabase/plannedEvents.ts` — event CRUD + fetch + RSVP + delete + past events
- `apps/web/src/integrations/supabase/clubMembers.ts` — club member queries + deactivation
- `apps/web/src/pages/Clubs.tsx` — Clubs list (navigates to /clubs/:clubId)
- `apps/web/src/pages/Game.tsx` — Unified game page (/game/:matchDayId) — teams, scores, actions
- `apps/web/src/pages/Dashboard.tsx` — Redirect wrapper (latest game → /game/:id, or empty state)
- `apps/web/src/components/nav/MobileChrome.tsx` — Route-based navbar visibility
- `apps/web/src/pages/Notifications.tsx` — Notifications list page
- `apps/web/src/pages/MembersGlobal.tsx` — Global members page (across all user's clubs)
- `apps/web/src/integrations/supabase/notifications.ts` — Notification queries (fetch, mark read, unread count)
- `apps/web/src/components/common/RealtimeAppEffect.tsx` — Realtime subscriptions (notifications, etc.)
- `apps/web/src/routes/AppRoutes.tsx` — All routes

## DB migrations applied
- `20260419000001_phase9_templates_location_noclub.sql` (event_templates, locations columns, RLS)
- `20260419000002_add_end_time_to_planned_events.sql` (end_time column)
- `20260422000007_notification_triggers.sql` (notification triggers + RPC rewrites — may have failed, see 000010)
- `20260422000008_rsvp_deadline_cron.sql` (pg_cron RSVP deadline reminders)
- `20260422000009_notifications_insert_policy.sql` (INSERT RLS policy on notifications)
- `20260422000010_repair_notification_triggers.sql` (**NEEDS APPLYING** — idempotent repair of triggers)

## Known issues
1. ~~**Home CORS**~~: Resolved.
2. ~~**club_members filters**~~: All queries now consistently use `.eq("is_active", true).eq("status", "active")` for active members.
3. ~~**Created event not shown in Home**~~: Resolved.

## Phases overview
- Phases 1-8: Completed (nav, events, RSVP, archive, clubs, members, bug fixes)
- Phase 9: Completed — Create Event improvements + Event Detail page + Home redesign
- Phase 10: Completed — Quick fixes (today highlight, location fix, menu cleanup, description/notes)
- Phase 11: Completed — Club Overview page (hero, members, settings sheet, RSVP display, admin management)
- Phase 12: Completed — Game Flow Unification (unified /game/:matchDayId, Start Game from events, nav link migration)
- Phase 13: Completed — UI Consistency Pass (Profile redesign, Clubs/JoinClub/NewClub/Members semantic styling)
- Phase 14: In Progress — Notifications system + bug fixes
- Phase 15: Advanced Filters (custom month range, filter by city)
- Phase 16: Settings page & Notification preferences
- Backlog: Set up email notifications
- Backlog: Build native iOS and Android app using monorepo
- Backlog: Tournament event type (complex, deferred)
- Backlog: Skill Score progression system (adjust algorithm, progression based on games/sets played)
