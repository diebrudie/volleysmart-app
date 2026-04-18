# VolleySmart App

## Current status
- Working on: Phase 9 — Create Event improvements (templates, location selector + address autocomplete, "no club" option)
- Last change: Built all Phase 9 features + applied DB migration. Still has bugs in Create Event flow that need fixing.
- Next step: Fix remaining Phase 9 bugs (see below), then Phase 10 — Notification left drawer + Chat pages (final phase)

## Phase 9 bugs to fix
1. **Members view toggle padding**: Active state of the grid/list view toggle has incorrect padding — needs CSS fix
2. **Address with house number fails**: Mapbox address autocomplete works for addresses without a number, but selecting an address with a house number fails (location row not created in DB). Likely an issue in `EventLocationSelector.tsx` `createFromMapbox()` — investigate the Mapbox `place_name` parsing or the DB insert payload.
3. **Created event not shown in Home**: Event is created successfully (toast shows success, redirects to /home) but the event doesn't appear in the feed. Likely issue in `fetchUpcomingEvents()` — the `locations(name, address)` select may cause a PostgREST error, or the clubless events query isn't returning results. Check the network response for 300/400 errors.
4. **Overall Create Event flow**: The whole create → view flow needs end-to-end testing and polish after bug fixes.

## Key files
- `apps/web/src/pages/CreateEvent.tsx` — 3-step event creation (Step 1: type + templates, Step 2: club + details, Step 3: options + save-as-template)
- `apps/web/src/components/forms/EventLocationSelector.tsx` — combined location picker: saved club locations + Mapbox address autocomplete
- `apps/web/src/integrations/supabase/plannedEvents.ts` — event CRUD + fetch (supports nullable club_id, location_id)
- `apps/web/src/integrations/supabase/eventTemplates.ts` — template CRUD API
- `apps/web/src/components/events/EventCard.tsx` — event display with RSVP, shows "Personal" for clubless events + address
- `apps/web/src/pages/MembersGlobal.tsx` — global members page (all clubs)
- `apps/web/src/pages/UpcomingEvents.tsx` — Home tab (upcoming events)
- `apps/web/src/pages/Archive.tsx` — Past Events page
- `apps/web/src/components/nav/MobileBottomNav.tsx` — bottom nav

## Branch
- Current branch: `feat/phase-9-create-event-improvements`
- DB migration applied: `supabase/migrations/20260419000001_phase9_templates_location_noclub.sql` (event_templates table, locations address/lat/lng columns, RLS updates for clubless events)
- PostgREST schema cache was reloaded after migration

## Known issues
1. **Home CORS**: Supabase returns `Access-Control-Allow-Origin` for a specific preview deployment URL. Wildcard in Redirect URLs doesn't work for CORS. User needs to use branch-stable URL or fix via Supabase API settings.
2. **club_members filters**: Some files use `.eq("status", "active")` instead of `.eq("is_active", true)`. Fixed in `plannedEvents.ts` and `CreateEvent.tsx`, but `Clubs.tsx`, `JoinClub.tsx`, `clubMembers.ts` still use `status`.

## Phases overview
- Phases 1-8: Completed (nav, events, RSVP, archive, clubs, members, bug fixes)
- Phase 9: In progress — Create Event improvements (templates, location selector, no-club)
- Phase 10: Next — Notification left drawer + Chat pages (final phase)
