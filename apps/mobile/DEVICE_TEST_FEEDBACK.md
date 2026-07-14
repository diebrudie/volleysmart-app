# Device test feedback (Expo Go)

Running log of issues flagged during on-device testing of `feat/mobile-phase3-parity`.
Each item gets a status: `open` / `fixed (commit)` / `wontfix (reason)`.

## Round 4 (2026-07-09) — after Round 3 fixes shipped

| # | Area | Issue | Status |
|---|------|-------|--------|
| R4-1 | Calendar badge | The badge shadow belongs on the event OVERVIEW (detail) page badge, NOT on the Events list card. Move it: remove from EventCard, add to the detail badge. | fixed (d888490) |
| R4-2a | Event Overview | Gradient still doesn't reach ~half of the date badge — extend further. | fixed (d888490) — eyeball on device |
| R4-2b | Event Overview | The top navbar (back/share/menu) should NOT be sticky/fixed — it should scroll away with the page. Only the bottom button bar stays fixed to the bottom. | fixed (d888490) |
| R4-3a | Profile | The Skill Rating box is missing from the Analytics tab (PWA img#23: "Skill Rating 58/100 +7 from gameplay" card at the top of Analytics). Add it. | fixed (d888490) |
| R4-3b | Profile | Set Record should live in its OWN box below the 4 analytics stat cards (PWA), not inside the same card. | fixed (d888490) |
| R4-3c | Profile | Remove the email address shown under the location in the profile header — email belongs only in the menu. | fixed (d888490) |

## Round 3 (2026-07-09) — after Round 2 fixes shipped

| # | Area | Issue | Status |
|---|------|-------|--------|
| R3-1 | Contact form | "Type your message" placeholder overlaps the "Message" label / sits outside the input box (multiline field layout). | fixed (d105a4a) |
| R3-2 | Contact form | When a field is focused the keyboard covers the whole form; can't scroll, can't reach Reason / Message / Submit. Make the sheet keyboard-aware + scrollable. | fixed (d105a4a) |
| R3-3 | Event Overview | Gradient should extend further down — in the PWA it reaches ~half of the date-badge number. Extend the native gradient to match. | fixed (f0f9bdf) — tuned blind, eyeball on device |
| R3-4 | Event Overview | Top buttons (share, menu) need the same slightly-translucent white rounded circular background as the back button (PWA uses bg-background/60). Currently only back has a ring; the others float bare. | fixed (f0f9bdf) |
| R3-5 | Event Overview | Details font is too big vs PWA — make slightly smaller with more vertical gap; location NAME slightly bolder, address lighter gray. | fixed (f0f9bdf) |
| R3-6 | Event Overview | "Friendly Game" uses the wrong icon (currently the trophy = tournament). Friendly should be crossed-swords, matching Create-event step 1. Map each event_type to its own icon. | fixed (f0f9bdf) |
| R3-7 | Event Overview | RSVP dropdown is clipped — only "Going" shows, "Not Going" is hidden behind the content above. Both Going + Not Going must show with no RSVP selected; once selected, offer "Cancel RSVP" to clear it (PWA img#21). | fixed (f0f9bdf) — z-index/elevation lift |
| R3-8 | Edit event | Location field lets you type anything; it should pull from the club's saved locations (a picker), not free text. | fixed (3c20acf) |
| R3-9 | Edit event | When a field is focused the keyboard covers content; add bottom padding so the last field is reachable above the keyboard. | fixed (3c20acf) |
| R3-10 | Profile | Secondary positions must be multi-select (1 to all); main position stays single. Currently secondary behaves like a radio (only one). | fixed (9b94b0c) |
| R3-11 | Members | Change the page heading (next to Manage Requests) to "All Members" so it doesn't duplicate the navbar "Members" — mirrors "Your Clubs" on the Clubs tab (this is the global cross-club members view). | fixed (021e0b8) |
| R3-12 | Calendar badge | Increase the colored top strip (month / TODAY) height a bit — more top+bottom padding. On the Events list the badge should also have a subtle shadow. | fixed (5bce70d detail, 021e0b8 card) |
| R3-13 | Create Event | Restructure steps: Step 1 = event type only (match PWA img#22 look); Step 2 = schedule (as is); Step 3 = Details incl. event NAME + club selection (moved out of step 1); keep a final Review step. | fixed (3c20acf) |

## Round 2 (2026-07-09) — after Round 1 fixes shipped

Priority legend: **P0** = crash/freeze/broken core, **P1** = missing feature / wrong behavior, **P2** = visual/polish, **P3** = proposal only.

### CRITICAL — freezes / dead actions (P0)
| # | Area | Issue | Status |
|---|------|-------|--------|
| R2-1 | Menu | Theme picker does not trigger anything and freezes the app | fixed (df40b03) |
| R2-2 | Menu | Language picker does not trigger anything and freezes the app | fixed (df40b03) |
| R2-3 | Menu | Contact Us does not trigger anything and freezes the app | fixed (df40b03) |
| R2-4 | Event Overview | Edit event button does nothing and freezes the app. If the event is recurrent, a popup must ask "edit only this event or all recurring?" (match PWA) | fixed — menu→edit now defers past the Sheet dismiss (onClosed); recurring scope dialog was already wired |
| R2-5 | Clubs tab | "Edit Club" from the card three-dots menu does not trigger any drawer/action | fixed (989b11a) |
| R2-6 | Club Page | "Edit Club" (club overview settings) — verify it opens the drawer (related to R2-5) | fixed (989b11a) |

> **Event Overview cluster (R2-4, R2-15..R2-23) — DONE (2026-07-09).** Reworked directly: gradient hero behind a transparent/borderless header (R2-15), 3-node Share2 icon (R2-16), Repeat recurrence icon (R2-18), block spacing bumped to 32 + Details rows 15px (R2-19/21), removed the 0/12 row (R2-20), and a sticky bottom bar with a yellow/green/red RSVP dropdown (opens upward) + a Start/View game button (R2-22/23). Edit freeze fixed via the onClosed defer (R2-4). NOTE: starting/viewing a game stays web-only on native (game layer deferred), so the right-hand button is a disabled "…(web only)" affordance rather than a live Start Game / View. Needs an on-device eyeball.

### Profile (P1/P2)
| # | Issue | Status |
|---|-------|--------|
| R2-7 | Profile has only "Profile" + "Clubs" tabs. PWA has 3: **Analytics**, **Positions**, **Clubs**. Match the PWA tab UI and the content per tab. | open |
| R2-8 | "Delete Account" must live inside the edit-profile drawer (not loose on the page). | open |
| R2-9 | Remove the "Delete Club" option from the profile Clubs tab. | open |
| R2-10 | Remove the Log out button from Profile — it belongs only in the menu. | open |

### Home (P2)
| # | Issue | Status |
|---|-------|--------|
| R2-11 | Remove the "Welcome back…" headline. | open |
| R2-12 | Today's/Next event card CTA should be a single "View Event", not "Going"/"Start Game". | open |
| R2-13 | Increase vertical spacing between elements inside cards — apply consistently across ALL cards (club card, event card, etc.). | open |
| R2-14 | Keep good spacing between the top navbar's bottom border and the page content. | open |

### Event Overview (P0/P1/P2) — see screenshots img#8 PWA vs img#9 native
| # | Issue | Status |
|---|-------|--------|
| R2-15 | Top gradient is missing; also remove the top divider line under the navbar. | fixed |
| R2-16 | Share icon is different from PWA (PWA uses the iOS share/upload glyph, native uses the node-share glyph). Match PWA. | fixed (share-social-outline to match web Share2) |
| R2-17 | (= R2-4) Edit event freezes; recurring events need the this/all popup. | fixed |
| R2-18 | "Weekly" recurrence icon differs from PWA. Match PWA. | fixed (repeat glyph) |
| R2-19 | Increase spacing BETWEEN blocks (title/tags block, Details block, Description, Hosted by, N Going) so they group visually — currently too tight. All blocks same larger spacing. | fixed (32px) |
| R2-20 | In Details block, remove the "0/12" (players allowed) row. | fixed |
| R2-21 | In Details block, increase per-row spacing (but less than the between-block spacing so it still reads as one group) and decrease the font size a bit (too big now). | fixed (rows 12px gap, 15px font) |
| R2-22 | RSVP control must match PWA (img#10/#11): a bottom-stuck dropdown button that is YELLOW when no RSVP, GREEN when going, RED when not going; next to it a "Start Game" button disabled until enough players. Bottom bar always stuck to bottom. | fixed (Start Game is a web-only affordance on native) |
| R2-23 | Bottom navbar (RSVP/Start Game bar) must always be stuck to the bottom. For a PAST event that had a Game, show "View event" leading to the event overview. | partial — bar is sticky; past+game shows "View game (web only)" since the native game layer is deferred |

### Clubs tab (P2/P0)
| # | Issue | Status |
|---|-------|--------|
| R2-24 | "Your Clubs" headline + Create Club button too close to the top navbar (see img#12). Add spacing. | open |
| R2-25 | (= R2-5) Edit Club from card menu triggers nothing. | open |

### Members tab (P2)
| # | Issue | Status |
|---|-------|--------|
| R2-26 | Headline + button too close to top navbar, same as Clubs. Keep spacing consistent app-wide. | open |

### Club Page / Edit Club drawer (P1/P2) — see img#13
| # | Issue | Status |
|---|-------|--------|
| R2-27 | Edit Club drawer: bottom buttons (Cancel / Save Changes) must be fixed/stuck to the bottom. | open |
| R2-28 | The "?" info tooltips next to some field titles (e.g. City, Make discoverable) are missing on some — ensure all PWA help "?" markers are present. | open |
| R2-29 | Decrease the font size of the input fields themselves. | open |
| R2-30 | Increase vertical spacing between elements while keeping grouping/hierarchy. | open |
| R2-31 | Sharing a club attaches TWO links to the message; should be ONE, with text like "Join our Volleyball Club" + the link. Translate accordingly (en/es/de). | open |

### Events tab (P1/P2/P3)
| # | Issue | Status |
|---|-------|--------|
| R2-32 | Upcoming: expand the calendar badge to fill the card's vertical space. | open |
| R2-33 | Past Events: when Score shows "Cancelled" it wraps and looks broken (img#14). Decrease font so it fits on one line while keeping all info. | open |
| R2-34 | (P3, PROPOSAL ONLY — do not change) Past-events table lines look poor. Propose a nicer UX for this list view; build a mockup or generate an image for the user to decide. | open |

### Game Page (P1)
| # | Issue | Status |
|---|-------|--------|
| R2-35 | The Game page does not exist at all on native — create it. (NOTE: Round-1 scope deliberately deferred the game layer; this reverses that decision. See PLAN-mobile-game-layer.md.) | open |

### Menu (P0/P1/P3)
| # | Issue | Status |
|---|-------|--------|
| R2-36 | (= R2-1/2/3) Theme, Language, Contact Us freeze. | open |
| R2-37 | FAQ page is not built yet — build it. | open |
| R2-38 | T&C and Privacy open in the browser. | wontfix — user chose to keep opening in the device browser (one canonical legally-reviewed copy). Already implemented via Linking.openURL in MenuDrawer. |

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

## Round 5 (2026-07-09) — game layer (branch feat/mobile-phase4-game-layer)

| # | Area | Issue | Status |
|---|------|-------|--------|
| R5-1 | Game detail | Move same-teams + delete into a top-right three-dots menu. | fixed (1e0acb2) |
| R5-2 | Game detail | Not enough top margin. | fixed (1e0acb2) |
| R5-3 | Game detail | Ellipsized names/positions — stack name over full position in the side-by-side columns. | fixed (1e0acb2) |
| R5-4 | Test data | Create a test game. | done via SQL seed (scratchpad/seed-test-game.sql) — MCP is read-only, user runs it in the Supabase SQL editor. Dated today (Latin Gang) so Live Score is testable. |

## Round 6 (2026-07-12) — game layer on device (branch feat/mobile-phase4-game-layer)

| # | Area | Issue | Status |
|---|------|-------|--------|
| R6-1 | Game detail | Three-dots menu: Edit Teams, Edit Location, same-teams, Delete Game; bottom button removed. | fixed (60381b6) |
| R6-2 | Game detail | Edit Teams reachable via the three-dots menu. | fixed (60381b6) |
| R6-3 | PWA (web) | Build the New-Game select-players/guests step in the PWA. | deferred — separate web branch |
| R6-4 | New Game | Reuse existing club guests via a dropdown + add-new path. | fixed (75c61d7) |
| R6-5 | Live Score | Landscape rotation on the Live Score screen (portrait restored on exit). | fixed (b278b9e) |
| R6-6 | Live Score | Every set targets 25 + win-by-2. | fixed (b278b9e) |
| R6-7 | Live Score | Dialog stacks long-labelled buttons full-width so text doesn't wrap. | fixed (b278b9e) |
| R6-8 | Game/Live Score | Back always returns to the event / game (no loop). | fixed (60381b6, b278b9e) |
| R6-9 | Home | Limit event title length on the Today's Game card to avoid ellipsis. | open |
| R6-10 | Home | Today's Game uses a football/soccer ball icon — change to a volleyball icon. | open |
| R6-11 | Events list | Calendar badge STRETCHES taller when "You're going" is present — keep the badge a fixed height regardless of the RSVP row. | open |
| R6-12 | Events list | "Double event" is EXPECTED — the seed creates two events (Start a Game + Pre-scored Game). Not a bug. | wontfix (by design) |

## Round 7 (2026-07-12) — Edit Teams (branch feat/mobile-phase4-game-layer)

| # | Issue | Status |
|---|-------|--------|
| R7-1 | Edit Teams top padding. | fixed |
| R7-2 | Position dropdown readable (full-width vertical layout). | fixed |
| R7-3 | Teams stacked vertically. | fixed |
| R7-4 | Replaced banner with an inline 'Move to [team]' button on the selected player (recommendation: tap-move over DnD). | fixed |
| R7-5 | Edit Teams 'Add guest' now queries existing club guests (dropdown) + add-new. | fixed |
