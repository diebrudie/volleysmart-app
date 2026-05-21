# Native App Migration Plan

Phase 0 (shared core extraction) is complete and merged. Phases 1-7 below cover the full mobile app build.

## Overview

| Phase | Name | Complexity | Screens | Branch |
|-------|------|-----------|---------|--------|
| 1 | Foundation & Auth | L | 5 | `feat/mobile-phase1-foundation-auth` |
| 2 | Navigation & Home | L | 4 | `feat/mobile-phase2-navigation-home` |
| 3 | Events CRUD | L | 4 | `feat/mobile-phase3-events` |
| 4 | Clubs | M | 5 | `feat/mobile-phase4-clubs` |
| 5 | Members & Profile | M | 5 | `feat/mobile-phase5-members-profile` |
| 6 | Games & Live Score | L | 4 | `feat/mobile-phase6-games-livescore` |
| 7 | Notifications & Onboarding | M | 5 | `feat/mobile-phase7-notifications-onboarding` |

**Total: ~29 screens, ~94 new files**

---

## Phase 1: Foundation & Auth

**Scope:** Wire up the provider stack, build the mobile UI component library, complete the full auth flow.

**What to build:**
- Modify `app/_layout.tsx`: wrap with QueryClientProvider, AuthProvider, CoreBootstrap (calls `setSupabaseClient()`)
- Auth screens: signup, forgot-password, reset-password, verify-email
- Restyle existing login.tsx with new components
- Set up i18n with `expo-localization` + core translations
- Port hooks: `useCurrentPlayerId`, `useIsAdmin`

**Files to create:**
```
providers/QueryProvider.tsx
providers/ThemeProvider.tsx
providers/CoreBootstrap.tsx          -- calls setSupabaseClient() at boot
hooks/useCurrentPlayerId.ts
hooks/useIsAdmin.ts
components/ui/Button.tsx             -- pressable with variants
components/ui/Input.tsx              -- TextInput with label + error
components/ui/Card.tsx
components/ui/Avatar.tsx             -- image + fallback initials
components/ui/Badge.tsx
components/ui/Spinner.tsx
components/ui/BottomSheet.tsx        -- @gorhom/bottom-sheet wrapper
components/ui/Toast.tsx
components/ui/Screen.tsx             -- SafeAreaView + ScrollView + RefreshControl
components/ui/EmptyState.tsx
constants/queryClient.ts
app/(auth)/_layout.tsx
app/(auth)/signup.tsx
app/(auth)/forgot-password.tsx
app/(auth)/reset-password.tsx
app/(auth)/verify-email.tsx
```

**Key decisions:**
- Use `StyleSheet.create` (no NativeWind/Tamagui) to keep dependencies low
- `@gorhom/bottom-sheet` for bottom sheets (reanimated + gesture-handler already installed)
- QueryClient config mirrors web: `staleTime: 20_000`, `gcTime: 10 * 60 * 1000`
- `react-hook-form` + `zod` for form validation

**New dependencies:** `@gorhom/bottom-sheet`, `react-native-svg`, `react-hook-form`, `zod`

---

## Phase 2: Navigation Shell & Home Dashboard

**Scope:** Build final tab structure, FAB for create actions, and the home dashboard.

**Depends on:** Phase 1

**What to build:**
- Rebuild `(tabs)/_layout.tsx`: 4 tabs (Home, Events, Clubs, Members) + center FAB
- Home Dashboard: today's events slider, upcoming events, discover section, quick stats
- EventCard component (most reused component in the app)

**Files to create:**
```
app/(tabs)/_layout.tsx               -- REBUILD: 4 tabs + FAB
app/(tabs)/index.tsx                 -- REBUILD: Home Dashboard
app/(tabs)/events.tsx                -- placeholder
app/(tabs)/clubs.tsx                 -- placeholder
app/(tabs)/members.tsx               -- placeholder
components/nav/TabBar.tsx            -- custom tab bar with FAB
components/nav/CreateFAB.tsx         -- floating action button
components/home/TodaysEvents.tsx
components/home/UpcomingSlider.tsx
components/home/DiscoverSection.tsx
components/home/QuickStats.tsx
components/events/EventCard.tsx
hooks/queries/useHomeData.ts
hooks/queries/useUserClubs.ts
```

**Key decisions:**
- Custom `tabBar` prop on `@react-navigation/bottom-tabs` for FAB placement
- FAB opens bottom sheet: Create Event, Start Game, New Club
- EventCard mirrors web's EventCard.tsx: date, title, RSVP status, club badge

---

## Phase 3: Events CRUD + RSVP

**Scope:** Full events: list, create, detail, RSVP, discover.

**Depends on:** Phase 2

**What to build:**
- Events list with upcoming/past tab switcher + month filter
- Event detail: info, attendees, RSVP, edit/cancel/delete
- 3-step event creation form
- Discover public events with city filter

**Files to create:**
```
app/(tabs)/events.tsx                -- full events list
app/events/[eventId].tsx             -- event detail
app/events/create.tsx                -- multi-step creation
app/events/discover.tsx              -- public events
components/events/EventList.tsx
components/events/EventFilters.tsx
components/events/MonthPicker.tsx    -- horizontal month scroll
components/events/AttendeesList.tsx
components/events/RSVPButton.tsx     -- sticky bottom, haptic
components/events/CreateEventForm.tsx
components/events/LocationSelector.tsx
hooks/queries/useEvents.ts
hooks/queries/useEventDetail.ts
hooks/mutations/useEventMutations.ts
```

**Key decisions:**
- RSVP is a prominent sticky button at screen bottom with haptic feedback
- Month filter is horizontal scrollable pill bar (not calendar dropdown)
- Location selector: text inputs initially (Mapbox autocomplete can come later)
- Event creation uses multi-step flow (fits mobile better than long form)

---

## Phase 4: Clubs

**Scope:** Club listing, overview, create, settings, invite flow.

**Depends on:** Phase 3 (reuses EventCard in club overview)

**What to build:**
- Clubs list page
- Club overview: header, upcoming events, recent games, members preview, settings
- Create club form
- Club settings (admin-only)
- Invite flow with share link + deep link acceptance

**Files to create:**
```
app/(tabs)/clubs.tsx                 -- clubs list
app/clubs/[clubId].tsx               -- club overview
app/clubs/new.tsx                    -- create club
app/clubs/[clubId]/settings.tsx      -- admin settings
app/clubs/[clubId]/invite.tsx        -- invite members
app/invite/[token].tsx               -- deep link invite acceptance
components/clubs/ClubCard.tsx
components/clubs/ClubHeader.tsx
components/clubs/ClubSettings.tsx
components/clubs/InviteSharePanel.tsx
hooks/queries/useClub.ts
hooks/mutations/useClubMutations.ts
```

**Key decisions:**
- Invite sharing via `expo-sharing` / React Native `Share` API
- Deep linking for `/invite/:token` requires Expo linking config in `app.json`
- Club image upload via `expo-image-picker` + core `storage` module

**New dependencies:** `expo-sharing`, `expo-image-picker`

---

## Phase 5: Members & Profile

**Scope:** Members views, admin management, user profile with stats.

**Depends on:** Phase 4

**What to build:**
- Global members across all clubs
- Club-specific members
- Manage members / approve requests (admin)
- User profile with volleyball stats + settings
- Notification preferences

**Files to create:**
```
app/(tabs)/members.tsx               -- global members
app/clubs/[clubId]/members.tsx       -- club members
app/clubs/[clubId]/manage.tsx        -- manage (admin)
app/profile/[userId].tsx             -- profile + stats
app/profile/notifications.tsx        -- notification preferences
components/members/MemberCard.tsx
components/members/MemberActions.tsx -- swipe/long-press admin actions
components/profile/StatsSection.tsx
components/profile/SettingsSection.tsx
hooks/queries/useMembers.ts
hooks/queries/useProfile.ts
hooks/mutations/useMemberMutations.ts
```

**Key decisions:**
- Admin member management uses swipe actions or long-press context menu (native feel)
- Profile stats mirror web's Volleyball tab: games played, win rate, positions, club filter
- Push notification toggle exists in UI but actual registration comes in Phase 7

---

## Phase 6: Games & Live Score

**Scope:** Game pages, live score tracker, game history. Most complex feature set.

**Depends on:** Phase 4, Phase 5

**What to build:**
- Unified game page: teams, scores, actions
- Live score tracker: tap-to-score interface (portrait-optimized for mobile)
- Game detail / post-game summary
- Edit game (admin/editor)

**Files to create:**
```
app/games/[matchDayId].tsx           -- unified game screen
app/games/[matchDayId]/live-score.tsx
app/games/[matchDayId]/detail.tsx
app/games/[matchDayId]/edit.tsx
components/games/TeamDisplay.tsx
components/games/ScoreBoard.tsx
components/games/SetBox.tsx
components/games/AddSetBox.tsx
components/games/LiveScoreTracker.tsx
components/games/GameActions.tsx
hooks/queries/useGame.ts
hooks/mutations/useGameMutations.ts
```

**Key decisions:**
- Live Score works in portrait with large tap targets (web forces landscape, mobile doesn't need to)
- Score animations via `react-native-reanimated`
- Real-time updates via Supabase Realtime (subscribe to `match_day_sets`)
- Web's unified Game.tsx is split into clearer sub-screens on mobile

---

## Phase 7: Notifications, Onboarding & Polish

**Scope:** Notifications, push registration, player onboarding, static pages.

**Depends on:** Phase 5. Push notifications require EAS Build (not Expo Go).

**What to build:**
- Notifications list with Realtime updates
- Push notification registration + token storage
- Player onboarding flow (gated: no profile -> onboarding before tabs)
- Static pages: FAQs, Terms, Privacy

**Files to create:**
```
app/notifications/index.tsx
app/(auth)/onboarding.tsx
app/static/faqs.tsx
app/static/terms.tsx
app/static/privacy.tsx
components/notifications/NotificationItem.tsx
components/notifications/NotificationBadge.tsx
components/onboarding/OnboardingSteps.tsx
hooks/queries/useNotifications.ts
hooks/usePushNotifications.ts
providers/NotificationProvider.tsx
```

**Key decisions:**
- Push tokens stored in `notification_preferences.push_token` (column exists in DB)
- `expo-notifications` requires development build via EAS
- Onboarding gated in AuthProvider: check if player profile exists, redirect if not
- Notifications use Supabase Realtime for live appearance without pull-to-refresh

**New dependencies:** `expo-notifications`, `expo-device`, `expo-linking`

---

## Cross-Cutting Patterns

**Core data reuse:** Every `hooks/queries/use*.ts` is a thin React Query wrapper around `@volleysmart/core` functions. Never duplicate Supabase queries in mobile.

**i18n:** `i18next` + `react-i18next` + `expo-localization` for device locale. Core translations from `@volleysmart/core`.

**Deep linking:** Configure `volleysmart://` scheme in `app.json`. Critical paths: `/invite/:token`, `/events/:eventId`, `/game/:matchDayId`.

**Images:** Use `expo-image` (already installed) everywhere. Supports caching and blurhash placeholders.

**Offline resilience:** React Query's `gcTime` keeps stale data visible. Consider `@tanstack/react-query-persist-client` + AsyncStorage as future polish.

---

## What's Already Done (Phase 0)

- `packages/core/` with 15+ Supabase data modules, types, i18n, utils
- Client injection: `setSupabaseClient()`/`getSupabaseClient()`
- Metro config for monorepo resolution
- Basic Expo scaffolding: root layout, 2-tab placeholder, login screen, AuthProvider (unwired), Supabase client with AsyncStorage
- Branch `feat/native-app-phase-0` merged to main
