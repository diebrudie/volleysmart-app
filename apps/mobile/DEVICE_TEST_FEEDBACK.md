# Device test feedback (Expo Go)

Running log of issues flagged during on-device testing of `feat/mobile-phase3-parity`.
Each item gets a status: `open` / `fixed (commit)` / `wontfix (reason)`.

## Round 1 (2026-07-08)

| # | Issue | Status |
|---|-------|--------|
| 1 | TopBar: title floats above the avatar/notification row; navbar must be one aligned line without extra vertical space. | fixed (0ac83ba) |
| 2 | Non-authenticated pages (login, signup, reset, onboarding) must be light mode always. | fixed |
| 3 | Home tab: Today's Game slider card not tappable. | fixed — card now navigates to the linked event detail. The native game screen is deliberately deferred (web-only), so event detail with its "view game in the web app" hint is the target. |
| 4 | Home tab: Last Game card navigates to "Unmatched route". | fixed — navigates to the linked event detail; games without a linked event show the web-only hint instead of navigating. |
| 5 | Home tab: stats numbers show no real data; Profile shows no stats. | fixed — the This-Month tiles were actually correct (0 games in the current month; PWA shows the same). The real gap: Profile had no stats section — an all-time Analytics card (mirroring the web volleyball tab) was added. |
| 6 | Club Overview: Locations and Share action buttons missing. | fixed — full PWA action-row order; Locations opens a bottom sheet with inline delete; Share uses native share with clipboard fallback in try/catch. |
| 7 | Club Overview event card: calendar icon must match PWA. | fixed — shared EventCard now uses the PWA's two-part calendar badge (red strip future / primary strip + tinted card today). |
| 8 | Event card shows extra info (Location row, total players, club name, end time). | fixed — card now shows exactly the PWA's rows. |
| 9 | Club edit modal: bottom slide, description overlap, Pick a photo, city-only Mapbox picker, remove delete-club. | fixed — dedicated multiline description block, tappable photo picker, Mapbox city autocomplete (inline suggestions, EXPO_PUBLIC_MAPBOX_TOKEN), delete-club moved to the Clubs card menu. |
| 10 | Invite member: broken back button; should open as bottom drawer. | fixed — Invite now opens a bottom sheet from club overview; the /clubs/[id]/invite deep-link route keeps working with the new arrow header. |
| 11 | Club Overview: Members button should scroll to the members list. | fixed — scrolls to the members section. |
| 12 | Dark mode blue not accessible — match PWA. | fixed — dark palette mirrors web `.dark` vars: #3661E2 primary on slate-950. |
| 13 | No way to change the theme. | fixed — Theme picker (Light/Dark/System) in the menu; synced to user_profiles.theme like the PWA. |
| 14 | Menu should slide from the right with all PWA options. | fixed — full-screen right-slide drawer: profile header, Help (FAQ, Contact form), Preferences (Language, Theme, Notifications), Legal (Terms, Privacy), Log out footer. |
| 15 | Back button never works; must be PWA-style plain arrow; Notifications styling off. | fixed — ScreenHeader (circular bordered arrow, canGoBack fallback) on all detail screens; Read-all is an unwrapped outline button. |
| 16 | Events page calendar icon (today vs future) doesn't match. | fixed — single shared EventCard everywhere. |
| 17 | Members page missing card/list view toggle. | fixed — grid/list toggle, grid default, persisted under the PWA's storage key. |
| 18 | Clubs page club card missing three-dots menu (edit/delete). | fixed — admin-only ellipsis menu: Edit reuses the settings sheet; Delete confirms then soft-deletes (same flow + RLS check as web). |

Note for other dev machines: `apps/mobile/.env` (gitignored) now needs `EXPO_PUBLIC_MAPBOX_TOKEN` (same value as `VITE_MAPBOX_TOKEN` in `apps/web/.env`) for the city picker.
