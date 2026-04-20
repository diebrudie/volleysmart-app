# VolleySmart App

## Current status
- Working on: Phase 11 — Club Overview page (IN PROGRESS)
- Last change: Initial Club Overview page created, needs testing and bug fixes
- Current branch: `feat/phase-11-club-overview` (branched from `feat/phase-10-quick-fixes-polish`)
- Next step: Test Club Overview, fix bugs, continue Phase 11 refinements

## Branching strategy
Branches stack on each other (not merged to main yet):
- `main` → `feat/phase-9-create-event-improvements` → `feat/phase-10-quick-fixes-polish` → `feat/phase-11-club-overview`

## Phase 11 work so far (Club Overview — IN PROGRESS)
- New `/clubs/:clubId` route with `ClubOverview.tsx`
- Hero section: club image background (gradient fallback), back button, settings gear (admin)
- Club info: name, "Playing since [year]", city, member count, description
- Action buttons row: Invite (share sheet), Members (navigate), Event Insights (disabled), Stats (disabled)
- Upcoming Event section: next event card + "Create an event" link
- Members list: avatars, names, admin badges, clickable → profile
- Clubs tab now navigates to `/clubs/:clubId` instead of `/dashboard/:clubId`
- Club Overview hidden from mobile chrome (HIDE_CHROME)
- **Needs:** Testing, bug fixes, UX refinements based on user feedback

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
- `apps/web/src/pages/ClubOverview.tsx` — Club overview page (NEW, Phase 11)
- `apps/web/src/pages/CreateEvent.tsx` — 3-step event creation with success dialog
- `apps/web/src/pages/EventDetail.tsx` — Event detail page with RSVP, attendees, delete, edit sheet
- `apps/web/src/pages/UpcomingEvents.tsx` — Home tab (upcoming + past events, filters, month filter)
- `apps/web/src/components/events/EventCard.tsx` — Event card with today highlight
- `apps/web/src/components/forms/EventLocationSelector.tsx` — two-field location picker (name + address with Mapbox)
- `apps/web/src/integrations/supabase/plannedEvents.ts` — event CRUD + fetch + RSVP + delete + past events
- `apps/web/src/pages/Clubs.tsx` — Clubs list (now navigates to /clubs/:clubId)
- `apps/web/src/pages/GameDetail.tsx` — Post-game details (back nav preserves tab state)
- `apps/web/src/pages/Dashboard.tsx` — Current game overview (will become /game/:matchDayId in Phase 12)
- `apps/web/src/components/nav/MobileMenuDrawer.tsx` — Cleaned up menu (Theme, FAQs, Logout)
- `apps/web/src/components/nav/MobileChrome.tsx` — Route-based navbar visibility
- `apps/web/src/routes/AppRoutes.tsx` — All routes

## DB migrations applied
- `20260419000001_phase9_templates_location_noclub.sql` (event_templates, locations columns, RLS)
- `20260419000002_add_end_time_to_planned_events.sql` (end_time column)

## Known issues
1. **Home CORS**: Supabase returns `Access-Control-Allow-Origin` for a specific preview deployment URL. Wildcard in Redirect URLs doesn't work for CORS.
2. **club_members filters**: Some files use `.eq("status", "active")` instead of `.eq("is_active", true)`. Fixed in `plannedEvents.ts` and `CreateEvent.tsx`, but `Clubs.tsx`, `JoinClub.tsx`, `clubMembers.ts` still use `status`.
3. **Created event not shown in Home**: May still need testing — possible PostgREST error in `fetchUpcomingEvents()` with locations join.

## Phases overview
- Phases 1-8: Completed (nav, events, RSVP, archive, clubs, members, bug fixes)
- Phase 9: Completed — Create Event improvements + Event Detail page + Home redesign
- Phase 10: Completed — Quick fixes (today highlight, location fix, menu cleanup, description/notes)
- Phase 11: **IN PROGRESS** — Club Overview page (initial build done, needs testing/fixes)
- Phase 12: Next — Game Flow Unification (Start Game → /game/:matchDayId, event lifecycle, game details improvements)
- Phase 13: UI Consistency Pass (Members, Profile, GameDetail — unified typography/spacing)
- Phase 14: Advanced Filters (custom month range, filter by city)
- Phase 15: Settings page & Notification preferences
