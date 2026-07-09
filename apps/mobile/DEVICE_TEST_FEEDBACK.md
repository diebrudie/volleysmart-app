# Device test feedback (Expo Go)

Running log of issues flagged during on-device testing of `feat/mobile-phase3-parity`.
Each item gets a status: `open` / `fixed (commit)` / `wontfix (reason)`.

## Round 2 (2026-07-09) — after Round 1 fixes shipped

Priority legend: **P0** = crash/freeze/broken core, **P1** = missing feature / wrong behavior, **P2** = visual/polish, **P3** = proposal only.

### CRITICAL — freezes / dead actions (P0)
| # | Area | Issue | Status |
|---|------|-------|--------|
| R2-1 | Menu | Theme picker does not trigger anything and freezes the app | open |
| R2-2 | Menu | Language picker does not trigger anything and freezes the app | open |
| R2-3 | Menu | Contact Us does not trigger anything and freezes the app | open |
| R2-4 | Event Overview | Edit event button does nothing and freezes the app. If the event is recurrent, a popup must ask "edit only this event or all recurring?" (match PWA) | open |
| R2-5 | Clubs tab | "Edit Club" from the card three-dots menu does not trigger any drawer/action | open |
| R2-6 | Club Page | "Edit Club" (club overview settings) — verify it opens the drawer (related to R2-5) | open |

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
| R2-15 | Top gradient is missing; also remove the top divider line under the navbar. | open |
| R2-16 | Share icon is different from PWA (PWA uses the iOS share/upload glyph, native uses the node-share glyph). Match PWA. | open |
| R2-17 | (= R2-4) Edit event freezes; recurring events need the this/all popup. | open |
| R2-18 | "Weekly" recurrence icon differs from PWA. Match PWA. | open |
| R2-19 | Increase spacing BETWEEN blocks (title/tags block, Details block, Description, Hosted by, N Going) so they group visually — currently too tight. All blocks same larger spacing. | open |
| R2-20 | In Details block, remove the "0/12" (players allowed) row. | open |
| R2-21 | In Details block, increase per-row spacing (but less than the between-block spacing so it still reads as one group) and decrease the font size a bit (too big now). | open |
| R2-22 | RSVP control must match PWA (img#10/#11): a bottom-stuck dropdown button that is YELLOW when no RSVP, GREEN when going, RED when not going; next to it a "Start Game" button disabled until enough players. Bottom bar always stuck to bottom. | open |
| R2-23 | Bottom navbar (RSVP/Start Game bar) must always be stuck to the bottom. For a PAST event that had a Game, show "View event" leading to the event overview. | open |

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
| R2-38 | (P3, DECISION NEEDED) T&C and Privacy currently open in the browser. Decide whether to build them natively/in-PWA or keep them external for legal reasons. | open |

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
