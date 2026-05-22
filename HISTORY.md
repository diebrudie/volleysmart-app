# VolleySmart App — Completed Work History

This file documents all completed features, phases, and fixes. For active work and the feature backlog, see [CLAUDE.md](./CLAUDE.md).

---

## Branching history (all merged to main)
- `main` → `feat/phase-9-create-event-improvements` → `feat/phase-10-quick-fixes-polish` → `feat/phase-11-club-overview` → `feat/phase-12-game-flow-unification`
- `feat/notifications` branched from `feat/phase-11-club-overview`
- `feat/discovery` branched from `feat/phase-11-club-overview` (merged to main)
- `feat/analytics` branched from `feat/discovery` (merged to main)
- `feat/analytics-filter-redesign` branched from `main` (merged to main)
- `feat/live-score-tracker` branched from `main` (merged to main)
- `feat/event-gender-activity` branched from `main` (merged to main)
- `feat/i18n` branched from `main` (merged to main)
- `fix/analytics-and-translations` branched from `main` (merged to main)
- `feat/quick-wins` branched from `main` (merged to main)
- `fix/reset-password-layout` branched from `main` (merged to main)
- `feat/join-request-email-and-fixes` branched from `main` (merged to main)
- `feat/phase-16-settings` branched from `main` (merged to main)
- `feat/terms-and-privacy` branched from `main` (merged to main)
- `feat/premium-gating` branched from `main` (merged to main)
- `feat/club-locations-management` branched from `main` (merged to main)
- `feat/native-app-phase-0` branched from `main` (merged to main)
- `feat/mobile-phase1-foundation-auth` branched from `main` (ready for PR)

---

## Phases overview
- Phases 1-8: Completed (nav, events, RSVP, archive, clubs, members, bug fixes)
- Phase 9: Completed. Create Event improvements + Event Detail page + Home redesign
- Phase 10: Completed. Quick fixes (today highlight, location fix, menu cleanup, description/notes)
- Phase 11: Completed. Club Overview page (hero, members, settings sheet, RSVP display, admin management)
- Phase 12: Completed. Game Flow Unification (unified /game/:matchDayId, Start Game from events, nav link migration)
- Phase 13: Completed. UI Consistency Pass (Profile redesign, Clubs/JoinClub/NewClub/Members semantic styling)
- Phase 14: Completed. Notifications system + bug fixes
- Discovery: Completed. Public events, discoverable clubs, attendee privacy, location sharing
- Phase 16: Completed. Grouped menu drawer, notification preferences (grouped rows), engagement notifications, position translations, skill score privacy + FAQs
- Native App Phase 0: Completed. Shared core extraction (`@volleysmart/core`), opponent team mode, club locations management
- Native App Phase 1: Complete (ready for PR). Foundation & Auth: providers (CoreBootstrap, QueryProvider, AuthProvider), UI component library (Button, Input, Card, Avatar, Badge, Spinner, Screen, EmptyState, Toast), 5 auth screens (login, signup, forgot-password, reset-password, verify-email), 4-tab layout, i18n with device locale, navy theme, VolleySmart logo, Google icon on OAuth buttons

---

## i18n (Internationalization). EN/ES/DE
**Branch:** `feat/i18n` | **Library:** react-i18next + i18next + i18next-browser-languagedetector

### What was done
1. ~~**Infrastructure**~~: i18next init, language detection (localStorage), `getDateLocale()` utility
2. ~~**LanguageSwitcher**~~: Drawer/Dialog picker (globe icon in navbar on homepage, in menu drawer for authenticated pages)
3. ~~**10 namespace files**~~: common, home, auth, onboarding, events, games, clubs, profile, notifications, validation. All 3 languages
4. ~~**String extraction**~~: Every page + component translated. Public pages, onboarding, authenticated pages, game flow, members, clubs
5. ~~**Zod schemas**~~: Factory functions with TFunction for auth validation messages
6. ~~**Date locale**~~: `getDateLocale()` utility, date-fns locale integration, capitalization for ES/DE day names
7. ~~**Position translations**~~: Client-side mapping from English DB names to translated display (Setter/Colocador/Zuspieler, etc.)
8. ~~**Contact form**~~: Full i18n (ContactSheet.tsx)
9. ~~**Manage Requests**~~: Full i18n (ManageMembers.tsx)
10. ~~**Location selector**~~: Full i18n (EventLocationSelector.tsx)
11. ~~**Game pages**~~: EditGame + NewGame fully translated
12. ~~**Hero overflow fix**~~: Removed `whitespace-nowrap` causing DE/ES text overflow

### Key files
- `apps/web/src/i18n/index.ts` — i18next init + config
- `apps/web/src/i18n/locales/{en,es,de}/*.json` — 10 namespace files x 3 languages
- `apps/web/src/lib/dateLocale.ts` — `getDateLocale()` utility
- `apps/web/src/components/common/LanguageSwitcher.tsx` — Language picker component

---

## Bug fixes. Analytics + translations + calendar UX
**Branch:** `fix/analytics-and-translations` (branched from `main`)

1. ~~**Analytics gamesPlayed**~~: `playerStats.ts` — `gamesPlayed = mdSetWins.size` so games with no scored sets (or only 0-0 sets) don't count. Profile total now matches the win/loss denominator (e.g. 11/11 instead of 14 vs 5/11).
2. ~~**Last Game winner translated**~~: `HomeDashboard.tsx` — `useLastGame` now returns winner identifier (`"A" | "B" | "draw"`); render uses `tGames("game.teamA"/"teamB")` + `t("home.wins")` so Spanish reads "Equipo B gana".
3. ~~**Spanish "wins" wording**~~: `es/events.json` — `home.wins`: `"victorias"` to `"gana"` (correct verb conjugation).
4. ~~**SetBox team labels**~~: `SetBox.tsx` — added `useTranslation("games")`; replaced 5 visible "Team A"/"Team B" labels (set card + edit dialog + edit drawer) with `t("game.teamA"/"teamB")`. Screen-reader-only description left as-is.
5. ~~**Calendar UX**~~: `UpcomingEvents.tsx` — disabled the previous-month chevron when calendar is at or before the current month (greyed out, unclickable). Forward navigation unaffected.

### Key files
- `apps/web/src/integrations/supabase/playerStats.ts:131` — `gamesPlayed = mdSetWins.size`
- `apps/web/src/pages/HomeDashboard.tsx:181-186, 280, 480-500` — winner identifier + translated render
- `apps/web/src/components/match/SetBox.tsx` — `useTranslation("games")` + 5 label replacements
- `apps/web/src/i18n/locales/es/events.json:13` — `home.wins: "gana"`
- `apps/web/src/pages/UpcomingEvents.tsx:109-128` — `isAtCurrentMonth` + disabled prev button

---

## Phase 14 completed work (Notifications + Bug Fixes)
1. ~~**Notification triggers (DB)**~~: 9 types: join request/accepted/rejected, member joined, event created/cancelled, RSVP, RSVP deadline reminder (pg_cron), game started
2. ~~**Notification helpers**~~: `notify_club_members()` + `notify_club_admins()` SECURITY DEFINER functions
3. ~~**RPC rewrites**~~: `request_join_by_slug` (with re-request after rejection), `approve_membership`, `reject_membership`. All with notification inserts
4. ~~**Notifications page**~~: `/notifications` route, Game Details-style header, type-aware icons, relative timestamps, mark as read
5. ~~**Realtime subscription**~~: Live notification updates via Supabase channel in `RealtimeAppEffect.tsx`
6. ~~**Bell icon + badge**~~: Enabled in MobileTopBar + Navbar, red dot for unread count
7. ~~**Event cancellation**~~: "Cancel Event" option in EventDetail dropdown, `cancelPlannedEvent()` function
8. ~~**Share event messages**~~: Dynamic text based on game state (not started / in progress / past)
9. ~~**View Game button styling**~~: Home tab uses outline variant matching EventDetail
10. ~~**Guest dropdown direction**~~: Forced popover to open downward in GuestNameSelector
11. ~~**Manage Requests visibility**~~: Hidden for non-admin users on Members page
12. ~~**CreateEvent club dropdown**~~: All active members can see their clubs (was admin/editor only)
13. ~~**Logout redirect**~~: Now goes to `/login`
14. ~~**Toast durations**~~: Capped at 2000ms across all files
15. ~~**Block admin deletion**~~: Can't delete account if admin of club with 2+ members
16. ~~**Remove Tournament**~~: Removed from event creation flow

### Notifications key files
- `supabase/migrations/20260422000007_notification_triggers.sql` — triggers + RPC rewrites
- `supabase/migrations/20260422000008_rsvp_deadline_cron.sql` — pg_cron daily reminder
- `supabase/migrations/20260422000009_notifications_insert_policy.sql` — INSERT RLS policy
- `supabase/migrations/20260422000010_repair_notification_triggers.sql` — idempotent repair
- `apps/web/src/integrations/supabase/notifications.ts` — fetch, mark read, unread count
- `apps/web/src/pages/Notifications.tsx` — notifications list page
- `apps/web/src/components/common/RealtimeAppEffect.tsx` — realtime subscription

---

## Discovery feature (completed)
1. ~~**Discover Events on Home**~~: Public events section on HomeDashboard, links to /discover-events
2. ~~**DiscoverEvents page**~~: `/discover-events` route with public event list
3. ~~**Non-member ClubOverview**~~: Join button via `request_join_club` RPC for discoverable clubs
4. ~~**Discoverable clubs on Clubs page**~~: Horizontal scroll section
5. ~~**Public EventDetail**~~: Organizer as "First L.", chat placeholder, club visibility gating
6. ~~**RSVP for public events**~~: Attend/decline/cancel RSVP, RSVPed events in upcoming list
7. ~~**Attendee privacy (GDPR)**~~: Organizer sees all via SECURITY DEFINER RPC; non-organizers see anonymized "Player N" + own row with real data
8. ~~**Public badge**~~: On EventCard (meta section) and EventDetail (badges section)
9. ~~**EventCard overflow fix**~~: Public badge moved to meta section, overflow-hidden on content
10. ~~**Today's slider for RSVPed events**~~: Non-organizer participants see today's public events
11. ~~**Declined events hidden from Today slider**~~: Club + public events with declined RSVP skipped
12. ~~**Fix request_join_club**~~: Updated requested_at on re-request, fixed notification type + payload
13. ~~**InviteMembers redesign**~~: Modern card layout, "Go to Club" button, replace: true navigation
14. ~~**ClubOverview back nav**~~: Goes to /clubs instead of navigate(-1)
15. ~~**Location sharing model**~~: Added `created_by` column, personal locations only visible to creator

### Discovery key files
- `apps/web/src/pages/DiscoverEvents.tsx` — public events list page
- `apps/web/src/pages/HomeDashboard.tsx` — today's slider + discover events section
- `supabase/migrations/20260426000001_public_event_rls.sql` — public event RLS
- `supabase/migrations/20260426000002_discoverable_clubs_rls.sql` — discoverable clubs RLS + request_join_club
- `supabase/migrations/20260426000003_public_event_player_visibility.sql` — get_event_attendees RPC
- `supabase/migrations/20260426000004_fix_request_join_club.sql` — fix notification type + requested_at
- `supabase/migrations/20260426000005_location_created_by.sql` — location privacy (created_by + RLS)

Future extensions: distance filter (PostGIS), country filter, category/sport filter

---

## Phase 12 completed work (Game Flow Unification)
1. **Unified `/game/:matchDayId` page**: New `Game.tsx` merges Dashboard + GameDetail: teams, SetBox scores, actions dropdown, edit scores table, location editing, delete, "New game w/ same teams"
2. **Start Game from EventDetail**: Creates match_day linked via `planned_event_id`, auto-generates teams from attending players using `assignTeams()`, navigates to `/game/:matchDayId`
3. **View Game button**: Once a game exists for an event, EventDetail shows "View Game" instead of "Start Game" (non-creators also see it)
4. **DB migration**: Unique partial index on `match_days.planned_event_id` prevents duplicate games per event
5. **Dashboard redirect wrapper**: `/dashboard/:clubId` now redirects to `/game/:latestMatchDayId` or shows empty state
6. **Navigation updates**: All `/game-details/` links to `/game/`, all `/dashboard/` links to `/clubs/` or `/game/` as appropriate
7. **Files updated**: Archive, Games, UpcomingEvents, NewGame, EditGame, InviteMembers, NotFound, Navbar, App.tsx, AppRoutes.tsx
8. **Gradient hero + semantic styling**: Applied ClubOverview-style gradient header, back arrow, 3-dots dropdown, semantic color classes (bg-card, text-foreground, etc.)

---

## Phase 13 completed work (UI Consistency Pass)
1. ~~**Profile redesign**~~: Strava-style layout (avatar+name side by side, stats row, positions badges, edit mode toggle). Removed tabs/Card wrappers/font-serif.
2. ~~**Clubs page**~~: font-serif to font-bold, all gray-* to semantic (bg-card, bg-muted, text-foreground, border-border, bg-popover)
3. ~~**JoinClub page**~~: bg-gray-100 to bg-background, Card/popover gray to semantic
4. ~~**NewClub page**~~: bg-gray-100 to bg-background, upload area to semantic, card bg-white to bg-card
5. ~~**Members page**~~: font-serif to font-bold, Card border to border-border, view toggle to bg-muted, all gray text to text-muted-foreground
6. ~~**Game page polish**~~: Position shortening (O. Hitter, M. Blocker), back nav fix, RSVP ordering by responded_at

---

## Phase 11 completed work (Club Overview)
1. ~~**Club Overview page**~~: New `/clubs/:clubId` route with hero, club info, action buttons, upcoming event, members list
2. ~~**Members fetch fix**~~: Two separate queries (club_members + players). No FK between tables, PostgREST can't join
3. ~~**Members button**~~: Scrolls to members section instead of navigating away
4. ~~**Admin member deletion**~~: Manage mode with checkboxes, bulk remove with confirmation dialog
5. ~~**Settings bottom sheet**~~: Converted Dialog to Sheet, matches Edit Event styling (scrollable content, fixed bottom buttons)
6. ~~**Settings description field**~~: Added editable description with 200 char max + counter
7. ~~**Dynamic RSVP on EventCard**~~: Shows "You're going" / "You declined" / "RSVP by today" based on user's status
8. ~~**useCurrentPlayerId hook**~~: Shared hook replacing inline player queries in UpcomingEvents
9. ~~**Member cards**~~: Display name as "Isabel B.", primary position, Admin label top-right, sorted A-Z, not clickable
10. ~~**EventDetail back nav**~~: Uses navigate(-1) to return to previous page (Club Overview or Home)
11. ~~**Club info refinements**~~: "Club created in MMM. YYYY" label, MapPin icon for city

---

## Phase 10 completed work (Quick Fixes & Polish)
1. ~~**Today's event highlight**~~: EventCard shows primary border, tinted bg, "Today" badge on calendar + title
2. ~~**Location bug fix**~~: EventLocationSelector shows saved locations from ALL user's clubs when no club selected
3. ~~**Address mandatory for new locations**~~: Validation toast if address is empty for new location
4. ~~**Remove "Maybe" RSVP**~~: Removed from `RsvpStatus` type (already removed from filter UI)
5. ~~**Menu drawer cleanup**~~: Removed Profile, Settings, Discover Clubs, Start Tournament; kept Theme + FAQs + Logout
6. ~~**Description/Notes label**~~: Renamed to "Description / Notes (optional)" with 100 char max + counter
7. ~~**EventDetail notes display**~~: Own standalone section with bold heading, no border
8. ~~**Details section reorder**~~: Date, Location, Event type
9. ~~**Bottom bar fix**~~: Solid white/card background with z-50, content padding pb-32

---

## Phase 9 completed work
1-11. See git history on `feat/phase-9-create-event-improvements` branch

---

## Quick Wins completed work (feat/quick-wins branch)
1. ~~**FEAT-31: Auto-link descriptions**~~: URLs in event notes rendered as clickable links via `Linkify` component
2. ~~**FEAT-33: Contact form images**~~: Image upload to Supabase Storage, `attachment_url` column in `contact_submissions`
3. ~~**Contact email notifications**~~: Edge Function `notify-contact-submission` sends branded email to `isabel.b@diebrudie.com` via Resend
4. ~~**Shared email template**~~: `emailTemplate.ts` with `buildEmailHtml()` + `sendEmail()`. Used by all Edge Functions
5. ~~**Branded auth templates**~~: `auth-confirm-email.html` + `auth-reset-password.html` for Supabase Dashboard (Go template vars)
6. ~~**Club invitations to Resend**~~: Rewrote `send-club-invitations` from Gmail SMTP to Resend API
7. ~~**Contact form success state**~~: Green checkmark + heading replaces form on success; red alert box for errors
8. ~~**Contact form email pre-fill**~~: Logged-in users get email pre-filled and read-only
9. ~~**Button asChild crash fix**~~: Skip icon wrapper when `asChild=true` to prevent `React.Children.only` error on ForgotPassword

### Dashboard config (already applied)
- **Auth SMTP Settings**: Custom SMTP ON, `smtp.resend.com`, port `465`, username `resend`, password = RESEND_API_KEY
- **Auth Email Templates**: `auth-confirm-email.html` into "Confirm signup", `auth-reset-password.html` into "Reset password"

---

## Join Request Email & Fixes (feat/join-request-email-and-fixes branch)
1. ~~**Join request email**~~: `notify-join-request` edge function. Sends branded email to all club admins when someone requests to join (supports `club_id` or `token` input). Fire-and-forget calls from ClubOverview + InvitePage.
2. ~~**Account deletion FK fix**~~: Migration `20260505000001`. NULLs all FK references (clubs.created_by, match_days.created_by, etc.) before deleting auth user. Made `clubs.created_by` nullable.
3. ~~**Cancelled events visibility**~~: Cancelled events now appear in upcoming tab (today) and past events tab (with red badge). Cancelled count added to club stats grid.
4. ~~**RSVP deadline dropdown**~~: Edit Event sheet uses preset dropdown (Same day, 1 day before, 3 days before, 1 week before, Custom) matching CreateEvent pattern.
5. ~~**Profile desktop layout**~~: Removed `lg:ml-60` sidebar offset. Content centers like EventDetail/Game pages.
6. ~~**iOS date/time overflow**~~: Birthday, date, start/end time inputs use `max-w-full appearance-none` + `boxSizing: border-box` to prevent iOS overflow.
7. ~~**Profile edit drawer sticky buttons**~~: Cancel/Save buttons fixed at bottom, only form content scrolls.
8. ~~**Team combinations slider**~~: Horizontal snap-scroll cards with vertical player list, position badges, sorted by position (Setter, MB, OH, Libero, Opposite). Uses `snapshot_name` fallback for guest players.
9. ~~**Home slider reorder**~~: Last Game shown first when no game today.
10. ~~**iOS zoom prevention**~~: `maximum-scale=1.0` in viewport meta.

### Key files
- `supabase/functions/notify-join-request/index.ts` — join request email edge function
- `supabase/migrations/20260505000001_fix_delete_own_account.sql` — account deletion FK fix

---

## Phase 16 completed work (Settings + Notification Preferences)
1. ~~**Grouped menu drawer**~~: MobileMenuDrawer redesigned into SportEasy-style grouped layout. Help (FAQs, Contact), Preferences (Language, Theme, Notifications), Legal (T&C, Privacy)
2. ~~**Notification Preferences page**~~: `/settings/notifications`. Per-type toggles for 11 notification types across 3 categories (Club Activity, Events, Games). In-app toggles functional, Push/Email disabled with "Coming soon"
3. ~~**DB migrations**~~: `notification_preferences` table with COALESCE pattern (no row = all enabled), `notify_club_members()` and `notify_club_admins()` rewritten to filter by preferences
4. ~~**Position translations**~~: Game.tsx, EventDetail.tsx, ClubOverview.tsx. Positions display in user's language via `tProfile("positions.name.X")`
5. ~~**Cancelled reason translation**~~: EventDetail.tsx. Maps DB English values to existing i18n keys
6. ~~**Desktop Navbar**~~: Added Notifications link to profile dropdown, removed disabled Settings item
7. ~~**Menu drawer fixes**~~: Removed double close X (SheetContent has built-in one), fixed stretched avatar (object-cover), tightened header spacing
8. ~~**Profile edit drawer padding**~~: Added pb-8 to "Delete my account" wrapper so it doesn't overlap fixed footer
9. ~~**Engagement notifications**~~: 5 new types (welcome, create club, create event, public event, come back) as onboarding drip campaign. Welcome fires via DB trigger on player insert. Others via pg_cron daily at 9 AM UTC with 3-day cooldown, 30-day cap, priority ordering. New "Engagement & Tips" category in notification preferences.
10. ~~**Notification preferences redesign**~~: Club Activity grouped into 2 subgroups (Club Requests + Member Changes) with descriptions. Events kept granular. Engagement as single toggle. Toggle columns evenly spaced. Mobile: toggles stacked below title. Enable/Disable all per category.
11. ~~**Email removed from Profile edit drawer**~~: Already visible in hamburger menu, no duplication needed.
12. ~~**Skill score privacy**~~: Skill rating only visible to profile owner (added `isOwnProfile` guard). Other users cannot see it.
13. ~~**Skill score FAQs**~~: 3 new FAQs in Account & Profile (EN/ES/DE): who can see it (private), can you change it (no), how does it improve (never decreases, gameplay bonus).

### Phase 16 key files
- `apps/web/src/pages/NotificationPreferences.tsx` — Notification preferences page (grouped rows with descriptions)
- `apps/web/src/integrations/supabase/notificationPreferences.ts` — Data layer (fetch, upsert, getPref)
- `apps/web/src/components/nav/MobileMenuDrawer.tsx` — Grouped menu drawer
- `supabase/migrations/20260506000001_notification_preferences.sql` — notification_preferences table
- `supabase/migrations/20260506000002_filter_notification_preferences.sql` — Filter triggers by preferences
- `supabase/migrations/20260506000003_engagement_notifications.sql` — Welcome trigger + daily engagement cron
- `supabase/migrations/20260506000004_skill_score_faqs.sql` — Skill score FAQs (idempotent)

---

## Terms & Privacy + UI Polish (feat/terms-and-privacy)
1. ~~**FEAT-26: Terms & Conditions + Privacy Policy**~~: `/terms` and `/privacy` pages with full legal text (EN/ES/DE), ReactMarkdown rendering, @tailwindcss/typography for prose styling. Auth-aware: unauthenticated shows public Navbar + Footer with forced light mode; authenticated shows scroll-hide header with back arrow.
2. ~~**Signup consent**~~: Required checkbox for email signup, informational OAuth notice. Uses `<Trans>` with link components to `/terms` and `/privacy`.
3. ~~**Home slider next-event fallback**~~: When no event today, queries next upcoming non-declined event. Shows "Next Event" card with date, title, "View Event" button. Only shows "Create Event" CTA if no upcoming events at all.
4. ~~**Dark mode primary blue**~~: Brightened from `225 80% 33%` to `225 75% 55%` in dark mode for better contrast. Updated `--ring`, `--sidebar-primary`, `--sidebar-ring` to match.
5. ~~**Position diagram i18n**~~: Dynamic image source based on `i18n.language`. Loads EN/ES/DE versions from `/public/`.
6. ~~**Position diagram viewer**~~: Desktop: replaced narrow right-side Sheet with centered `max-w-4xl` Dialog. Mobile: tap-to-zoom fullscreen overlay with close X button, z-[200] to avoid drawer interference. Applied to both Profile.tsx and PlayerOnboarding.tsx.
7. ~~**Desktop navbar dropdown restructure**~~: Moved Theme + Language from sidebar bottom into profile dropdown. Four grouped sections with visible divider lines: Profile | Help (FAQs + Contact) | Preferences (Notifications + Theme + Language) | Logout.
8. ~~**Notifications page layout**~~: Hidden desktop sidebar on `/notifications` and `/settings/notifications`, removed `lg:ml-60` for full-width centered layout.
9. ~~**Team combo win count bug**~~: Changed key separator from `_` to `|` in `clubStats.ts` to prevent `split("_")` from breaking `team_a`/`team_b` names.
10. ~~**Footer redesign**~~: Vertical centered layout with legal links row (Terms, Privacy, FAQs), `whitespace-nowrap` to prevent tablet wrapping.
11. ~~**FAQs auth-aware**~~: Updated to same pattern as legal pages (public Navbar+Footer vs scroll-hide header).
12. ~~**Close X enlarged**~~: Sheet component close button increased to `h-10 w-10` rounded circle for better tap targets.
13. ~~**Menu drawer**~~: Terms + Privacy links enabled (removed disabled state + coming soon badge).

### Terms & Privacy key files
- `apps/web/src/pages/TermsPage.tsx` — Terms & Conditions page
- `apps/web/src/pages/PrivacyPage.tsx` — Privacy Policy page
- `apps/web/src/i18n/locales/{en,es,de}/legal.json` — Legal namespace translations
- `apps/web/src/pages/Signup.tsx` — Consent checkbox + OAuth notice
- `apps/web/src/components/layout/Navbar.tsx` — Desktop dropdown restructure
- `apps/web/src/components/layout/Footer.tsx` — Vertical layout + legal links

---

## Premium Gating + Pricing + Club Defaults (feat/premium-gating)
1. ~~**Premium gating system**~~: `usePremium` hook (checks `is_early_adopter` column + super-admin overrides), `PremiumGate` component (blur + lock + upgrade CTA). Analytics gated on Profile + ClubOverview. Skill rating kept above paywall.
2. ~~**First-100-users early adopter**~~: `is_early_adopter` boolean on players table. First 100 by `created_at` marked permanently. Trigger auto-flags new signups until cap reached. Survives account deletion.
3. ~~**Homepage Pricing section**~~: Free vs Premium cards with early adopter banner. 6 premium features listed (analytics, city switching, team pairings, data export). "Pricing" nav link in desktop + mobile landing nav.
4. ~~**Navbar hide-on-scroll**~~: Extended to Terms, Privacy, FAQs pages (was homepage only).
5. ~~**Club default image picker**~~: 5 random volleyball images (3 indoor, 2 beach) on NewClub + ClubSettings. Shuffle/refresh button. "or upload your own" divider.
6. ~~**FAQ update**~~: "Is VolleySmart free?" updated with pricing info (EN/ES/DE).

### Premium gating key files
- `apps/web/src/hooks/usePremium.ts` — Premium status hook (early adopter + super-admin)
- `apps/web/src/components/common/PremiumGate.tsx` — Blur overlay wrapper
- `apps/web/src/components/home/PricingSection.tsx` — Homepage pricing cards
- `supabase/migrations/20260511000001_update_pricing_faq.sql` — FAQ text update
- `supabase/migrations/20260511000002_early_adopter_column.sql` — is_early_adopter + trigger

---

## Native App Phase 0. Shared Core Extraction (completed)
**Branch:** `feat/native-app-phase-0` (merged to main)

### What was done
1. ~~**`@volleysmart/core` package**~~: Extracted 17 Supabase data modules, i18n translations (33 JSON files x 11 namespaces x 3 languages), and utility functions into `packages/core/`
2. ~~**Client injection pattern**~~: `setSupabaseClient`/`getSupabaseClient`. Each platform provides its own Supabase client with appropriate storage (localStorage vs AsyncStorage)
3. ~~**Web re-export shims**~~: All `apps/web/src/integrations/supabase/*.ts` files replaced with thin re-exports from `@volleysmart/core`. React Query hooks remain web-only.
4. ~~**i18n sharing**~~: `packages/core/src/i18n/` exports structured `translations` object consumed by both web and mobile
5. ~~**dateLocale platform-agnostic**~~: Changed to `getDateLocale(lang: string)`. No dependency on `i18n.language` in core
6. ~~**Metro config**~~: `watchFolders` + `nodeModulesPaths` for monorepo resolution in Expo

### Core key files
- `packages/core/src/index.ts` — barrel export
- `packages/core/src/supabase/clientHolder.ts` — client injection bridge
- `packages/core/src/supabase/*.ts` — 17 data modules (profiles, players, club, clubMembers, plannedEvents, matchDays, notifications, etc.)
- `packages/core/src/i18n/index.ts` — translations aggregator
- `packages/core/src/utils/dateLocale.ts` — `getDateLocale(lang)`
- `packages/core/src/utils/formatName.ts` — name formatting

---

## Opponent Team Mode (completed)
**Branch:** `feat/native-app-phase-0` (merged to main)

### What was done
1. ~~**DB migration**~~: `20260514000001`. Added `is_opponent_mode` (boolean) and `opponent_team_name` (text) to `planned_events` and `match_days`
2. ~~**CreateEvent toggle**~~: "Play against another club" switch, opponent team name input field
3. ~~**EventDetail display**~~: Shield icon + opponent name in details section, edit support
4. ~~**Game page**~~: Team B shows shield icon + opponent team name when in opponent mode
5. ~~**i18n**~~: Full EN/ES/DE translations for opponent mode keys in events + games namespaces

### Key files
- `supabase/migrations/20260514000001_opponent_team_mode.sql`
- `packages/core/src/supabase/plannedEvents.ts` — opponent mode fields in types + CRUD
- `apps/web/src/pages/CreateEvent.tsx` — toggle + input
- `apps/web/src/pages/EventDetail.tsx` — display + edit
- `apps/web/src/pages/Game.tsx` — opponent team display

---

## Club Locations Management (completed)
**Branch:** `feat/club-locations-management` (merged to main)

### What was done
1. ~~**Locations tab**~~: Admin-only view of saved locations per club on ClubOverview
2. ~~**Delete locations**~~: Admin can delete saved locations with confirmation dialog
3. ~~**FK cascade fix**~~: `planned_events.location_id` changed to `ON DELETE SET NULL` (was RESTRICT, caused 409)
4. ~~**Delete RLS policy**~~: Only club admins can delete locations

### Key files
- `supabase/migrations/20260511000003_location_delete_rls.sql` — DELETE policy
- `supabase/migrations/20260511000004_fix_location_fk_cascade.sql` — FK ON DELETE SET NULL

---

## DB migrations applied
- `20260419000001_phase9_templates_location_noclub.sql` (event_templates, locations columns, RLS)
- `20260419000002_add_end_time_to_planned_events.sql` (end_time column)
- `20260422000007_notification_triggers.sql` (notification triggers + RPC rewrites)
- `20260422000008_rsvp_deadline_cron.sql` (pg_cron RSVP deadline reminders)
- `20260422000009_notifications_insert_policy.sql` (INSERT RLS policy on notifications)
- `20260426000006_rescale_skill_ratings.sql` (rescale existing players' skill_rating from old 0-100 to new 0-75 scale)
- `20260426000007_fix_skill_ratings.sql` (fix ALL players' skill_rating, overwrites any inflated scores)
- `20260506000001_notification_preferences.sql` (notification_preferences table)
- `20260506000002_filter_notification_preferences.sql` (Filter triggers by preferences)
- `20260506000003_engagement_notifications.sql` (Welcome trigger + daily engagement cron)
- `20260506000004_skill_score_faqs.sql` (Skill score FAQs)
- `20260511000001_update_pricing_faq.sql` (FAQ text update)
- `20260511000002_early_adopter_column.sql` (is_early_adopter + trigger)
- `20260511000003_location_delete_rls.sql` (DELETE policy)
- `20260511000004_fix_location_fk_cascade.sql` (FK ON DELETE SET NULL)
- `20260514000001_opponent_team_mode.sql` (opponent mode columns)

## Resolved issues
1. ~~**Home CORS**~~: Resolved.
2. ~~**club_members filters**~~: All queries now consistently use `.eq("is_active", true).eq("status", "active")` for active members.
3. ~~**Created event not shown in Home**~~: Resolved.
