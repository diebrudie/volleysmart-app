# VolleySmart App

## Current status
- Working on: Phase 12 — Game Flow Unification
- Last change: Phase 12 — unified Game page, Start Game from events, nav updates
- Current branch: `feat/phase-12-game-flow-unification` (branched from `feat/phase-11-club-overview`)
- Next step: Test & polish Phase 12, then merge

## Branching strategy
Branches stack on each other (not merged to main yet):
- `main` → `feat/phase-9-create-event-improvements` → `feat/phase-10-quick-fixes-polish` → `feat/phase-11-club-overview` → `feat/phase-12-game-flow-unification`

## Phase 12 in-progress work (Game Flow Unification)
1. **Unified `/game/:matchDayId` page**: New `Game.tsx` merges Dashboard + GameDetail — teams, SetBox scores, actions dropdown, edit scores table, location editing, delete, "New game w/ same teams"
2. **Start Game from EventDetail**: Creates match_day linked via `planned_event_id`, auto-generates teams from attending players using `assignTeams()`, navigates to `/game/:matchDayId`
3. **View Game button**: Once a game exists for an event, EventDetail shows "View Game" instead of "Start Game" (non-creators also see it)
4. **DB migration**: Unique partial index on `match_days.planned_event_id` prevents duplicate games per event
5. **Dashboard → redirect wrapper**: `/dashboard/:clubId` now redirects to `/game/:latestMatchDayId` or shows empty state
6. **Navigation updates**: All `/game-details/` links → `/game/`, all `/dashboard/` links → `/clubs/` or `/game/` as appropriate
7. **Files updated**: Archive, Games, UpcomingEvents, NewGame, EditGame, InviteMembers, NotFound, Navbar, App.tsx, AppRoutes.tsx

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
- Phase 11: Completed — Club Overview page (hero, members, settings sheet, RSVP display, admin management)
- Phase 12: In progress — Game Flow Unification (unified /game/:matchDayId, Start Game from events, nav link migration)
- Phase 13: UI Consistency Pass (Members, Profile, GameDetail — unified typography/spacing)
- Phase 14: Advanced Filters (custom month range, filter by city)
- Phase 15: Settings page & Notification preferences
