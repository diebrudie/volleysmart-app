# Mobile App — Device Test Checklist (Phase 3 parity)

The Phase 3 build was verified by driving the app's **Expo Web** build in a headless
browser. That proves the React/logic layer, but a browser cannot exercise
native-only behavior. Run this checklist on a **real device** (Expo Go or a dev build)
before merging. Branch: `feat/mobile-phase3-parity`.

How to run on your phone:
```
cd apps/mobile
npx expo start          # scan the QR code with Expo Go (same Wi-Fi)
```

## Already verified in browser (spot-check only on device)
These passed automated web testing — just confirm they render/behave on device:
- Events tab: upcoming/past tabs, calendar view, **filters** (now inline chips), sort
- Create Event wizard (all 4 steps) → event appears; RSVP going/not-going
- Event detail: edit, cancel-with-reason, delete, **share**, attendee list
- Clubs tab, club overview, **stats tab**, settings sheet, **create + delete club**
- Members tab (search/sort/filter), manage mode, **coach toggle**, join-request → manage screen
- Invite: generate link, validate page
- Home dashboard cards + discover; Notifications inbox + mark-all-read; Notification preferences
- Profile edit (height/positions/city) persists; menu drawer

## Native-only — MUST verify on device (browser could not)

### Gestures & sheets
- [ ] Bottom sheets (filters, club settings, guests, edit-event, template picker) slide up smoothly and **drag-to-dismiss** works
- [ ] Nested flows open correctly: **Edit Event** sheet, **Cancel Event** reason picker, **Recurring scope** dialog (edit a recurring event → "this / all future")
- [ ] Dialogs (delete club, delete account, leave club) appear **above** their parent sheet — this was the class of bug fixed for web; confirm on native too
- [ ] Date picker and Time picker in the Create/Edit event flow scroll and select correctly

### Keyboard
- [ ] Text inputs (create event, create club, profile edit, cancel reason, invite) push content up, don't hide the field, and dismiss on tap-away
- [ ] Multiline notes / description fields behave and respect char counters

### Media & sharing (no web equivalent)
- [ ] **Image picker**: change club image (create/settings) and profile avatar → picker opens, upload succeeds, new image shows
- [ ] **Share sheet**: event detail share → native share sheet opens (on web it falls back to clipboard)

### Safe areas & layout
- [ ] Top bar / status bar spacing correct on a notched device
- [ ] Bottom tab bar + FAB clear the home indicator; nothing clipped
- [ ] Dark mode: toggle device appearance → colors, cards, text remain legible across all screens

### Deep links & auth
- [ ] Open an invite link `volleysmart://invite/<token>` (or the https link) while **logged out** → after login it lands back on the invite accept screen (pending-token persistence)
- [ ] Password reset email link opens the reset-password screen with a valid session
- [ ] Google OAuth sign-in round-trips

### Realtime (needs a second device/account)
- [ ] With the app open on the event detail, have another user RSVP → attendee count / notification badge updates **without manual refresh**
- [ ] Notification bell badge clears live after mark-all-read

### Flows not covered by web testing
- [ ] **Onboarding wizard**: sign up a brand-new account (or one with no player row) → 13-step wizard runs → lands on Home with a created profile. (All existing test accounts already have profiles, so this was not auto-tested.)
- [ ] **Invite accept as a new member**: a non-member opens an invite link and joins → appears in the club members list
- [ ] **Delete account**: open the dialog (do not confirm unless on a throwaway account)

## Known deferred (not bugs — intentionally out of scope for this phase)
- Game screen, Live Score, team generator, player analytics → show "web only" hints
- Discover events **map view** (list only on mobile)
- Mapbox address autocomplete (plain text city/location inputs for now)
- Push notifications (in-app only; `notification_preferences.push` column ready)

## Bugs found & fixed during web testing (re-verify these specifically)
1. Event **Share** crashed the screen when clipboard was blocked → now shows the link safely
2. **Delete Club** confirm was unreachable (two stacked modals) → settings sheet now hides while the dialog is open
3. Event **filters** (RSVP/Month) couldn't be tapped (nested modal) → replaced with inline chips
