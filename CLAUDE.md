# VolleySmart App

## Current status
- Working on: Phase 8 — Home two-tabs (Upcoming Events + Archive), Members page
- Last change: Fixed Members 400 bug — root cause was `MembersGlobal.tsx` selecting `country` column which doesn't exist on `players` table (it's on `clubs`). Removed `country` select and country filter UI.
- Next step: Remaining issues — CORS for preview deployments, `status` vs `is_active` filter inconsistencies in some files.

## Key files
- `apps/web/src/pages/MembersGlobal.tsx` — global members page (all clubs)
- `apps/web/src/pages/Members.tsx` — per-club members page
- `apps/web/src/integrations/supabase/players.ts` — working query pattern with `player_positions(id, position_id, is_primary, positions(id, name))`
- `apps/web/src/integrations/supabase/plannedEvents.ts` — upcoming events fetch
- `apps/web/src/pages/UpcomingEvents.tsx` — Home tab (upcoming events only)
- `apps/web/src/pages/Archive.tsx` — Past Events page
- `apps/web/src/components/nav/MobileBottomNav.tsx` — bottom nav with Archive tab restored

## Branch
- Current branch: `feat/phase-8-home-two-tabs`
- DB migration applied: `supabase/migrations/20260418000001_link_match_days_to_planned_events.sql` (links match_days to planned_events)

## Known issues
1. **Home CORS**: Supabase returns `Access-Control-Allow-Origin: https://1d529d85.volleysmart-app.pages.dev` for all preview deployments. Wildcard in Redirect URLs doesn't work for CORS. User needs to use branch-stable URL or fix via Supabase API settings.
2. **club_members filters**: Some files use `.eq("status", "active")` instead of `.eq("is_active", true)`. Fixed in `plannedEvents.ts` and `CreateEvent.tsx`, but `Clubs.tsx`, `JoinClub.tsx`, `clubMembers.ts` still use `status`.
