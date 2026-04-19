# VolleySmart App

## Current status
- Working on: Phase 9 — Create Event UX overhaul + Event Detail page
- Last change: 6 Create Event UX improvements + Event Detail page + success dialog
- Next step: Fix remaining bugs (event not shown in Home feed), then Phase 10

## Phase 9 completed work
1. ~~**Members view toggle padding**~~: Fixed — h-7 w-7 items inside p-1 container
2. ~~**Address with house number fails**~~: Fixed — rewrote EventLocationSelector to two-field design
3. ~~**Location selector UX**~~: Name locks after selection (readOnly + X clear), address disabled until name exists, pencil icon to edit
4. ~~**Event type cards layout**~~: Horizontal row (icon + title), Templates moved to bottom sheet drawer with delete
5. ~~**Club selector**~~: Replaced buttons with Select dropdown, "No club" default
6. ~~**Event name label**~~: Renamed "Event title" to "Event name"
7. ~~**End time field**~~: Added DB column + form field side-by-side with Start time
8. ~~**RSVP dropdown**~~: Replaced buttons with Select, Custom shows toggle button + inline calendar
9. ~~**Template improvements**~~: end_time + notes now saved in templates
10. ~~**Success dialog**~~: After event creation, shows dialog with "View event" + "Dismiss"
11. ~~**Event Detail page**~~: New `/events/:eventId` route with full event overview

## Phase 9 remaining bugs
1. **Created event not shown in Home**: Event is created successfully but doesn't appear in the feed. Likely issue in `fetchUpcomingEvents()` — the `locations(name, address)` select may cause a PostgREST error, or the clubless events query isn't returning results.
2. **Overall Create Event flow**: End-to-end testing still needed.

## Key files
- `apps/web/src/pages/CreateEvent.tsx` — 3-step event creation with success dialog
- `apps/web/src/pages/EventDetail.tsx` — Event detail page with RSVP, attendees, delete
- `apps/web/src/components/forms/EventLocationSelector.tsx` — two-field location picker (name + address with Mapbox)
- `apps/web/src/integrations/supabase/plannedEvents.ts` — event CRUD + fetch + RSVP + delete
- `apps/web/src/integrations/supabase/eventTemplates.ts` — template CRUD API
- `apps/web/src/components/events/EventCard.tsx` — event card with RSVP
- `apps/web/src/pages/UpcomingEvents.tsx` — Home tab (upcoming events)
- `apps/web/src/routes/AppRoutes.tsx` — routing (includes `/events/:eventId`)

## Branch
- Current branch: `feat/phase-9-create-event-improvements`
- DB migrations applied:
  - `20260419000001_phase9_templates_location_noclub.sql` (event_templates, locations columns, RLS)
  - `20260419000002_add_end_time_to_planned_events.sql` (end_time column)

## Known issues
1. **Home CORS**: Supabase returns `Access-Control-Allow-Origin` for a specific preview deployment URL. Wildcard in Redirect URLs doesn't work for CORS.
2. **club_members filters**: Some files use `.eq("status", "active")` instead of `.eq("is_active", true)`. Fixed in `plannedEvents.ts` and `CreateEvent.tsx`, but `Clubs.tsx`, `JoinClub.tsx`, `clubMembers.ts` still use `status`.

## Future features to add
- **Map integration**: Replace gradient hero on EventDetail with interactive map (Mapbox) showing event location
- **Edit event**: EventDetail 3-dot menu "Edit event" currently disabled — needs EditEvent page
- **Start Game**: Button on EventDetail triggers team creation + opens sets/points view

## Phases overview
- Phases 1-8: Completed (nav, events, RSVP, archive, clubs, members, bug fixes)
- Phase 9: In progress — Create Event improvements + Event Detail page
- Phase 10: Next — Notification left drawer + Chat pages (final phase)
