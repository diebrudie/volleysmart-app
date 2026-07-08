# Device test feedback (Expo Go)

Running log of issues flagged during on-device testing of `feat/mobile-phase3-parity`.
Each item gets a status: `open` / `fixed (commit)` / `wontfix (reason)`.

## Round 1 (2026-07-08)

| # | Issue | Status |
|---|-------|--------|
| 1 | TopBar: title floats above the avatar/notification row instead of being vertically centered with it (safe-area padding bug, invisible on web). Also: navbar must be ONE line — avatar, title, chat, bell, menu all aligned; remove the extra vertical space (Clubs page padding-top too narrow to content). | fixed (0ac83ba) |
| 2 | Non-authenticated pages (login, signup, reset, onboarding) must be light mode always, not theme-aware. | open |
| 3 | Home tab: Today's Game slider card not tappable — should navigate to the game's page. | open |
| 4 | Home tab: Last Game card navigates to "Unmatched route". | open |
| 5 | Home tab: stats numbers show no real data; tapping redirects to Profile but no stats displayed there either. | open |
| 6 | Club Overview: Locations and Share action buttons missing. | open |
| 7 | Club Overview event card: calendar icon styling must match PWA exactly. | open |
| 8 | Club Overview event card: shows extra info not in PWA — Location row, total players allowed, club name, end time. Remove to match PWA. | open |
| 9 | Club edit modal: must slide from bottom; description field overlaps content; missing "Pick a photo" option; location must be city-only Mapbox picker (currently shows country + country code, should use the Mapbox API key); remove Delete-club from this modal (delete belongs in Clubs page card three-dots menu). | open |
| 10 | Invite member: back button doesn't work; whole element should become a bottom drawer (modal opens as bottom drawer, standard arrow back). | open |
| 11 | Club Overview: Members button should scroll down to the members list. | open |
| 12 | Dark mode blue is not accessible — match the PWA's dark-mode palette. | open |
| 13 | No way to change the theme — add theme switcher. | open |
| 14 | Menu drawer: should slide in from the RIGHT and include all PWA menu options (match PWA styling). | open |
| 15 | Back button never works anywhere; must look like PWA's (plain arrow, no "back" word). Notifications screen: read-all button wrapped in stray secondary div; overall styling must match PWA. | open |
| 16 | Events page: red calendar icon (today vs future) doesn't match the event-overview styling. Match them. | open |
| 17 | Members page: missing card-view / list-view toggle buttons. | open |
| 18 | Clubs page: club card missing three-dots menu with edit/delete club options. | open |
