# CLAUDE.md

This file provides guidance to any LLM (Claude, ChatGPT, etc.) when working with the **VolleySmart** codebase.

## Core mental model:

VolleySmart web is a club-scoped PWA sitting in apps/web, built with Vite + React, deployed via Cloudflare Pages with a Rollup-native workaround, and sharing a small @volleysmart/core package. Everything else should fit into those constraints.

VolleySmart is currently a **monorepo** with:

- `apps/web` – the production PWA (Vite + React + TS) deployed to Cloudflare Pages.
- `apps/mobile` – an Expo / React Native app (early bootstrap).
- `packages/core` – shared, framework-agnostic TypeScript utilities, types and helpers.

The **web app** is the primary product and the only thing deployed via Cloudflare Pages right now.

---

## 🏐 Project Overview

### Tech Stack (current)

- **Frontend (web)**: React 18 + TypeScript + Vite 7 + `@vitejs/plugin-react-swc`
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI primitives
- **Backend**: Supabase (Auth, Database, Storage, RLS)
- **State Management**: React Context (AuthContext, ClubContext, ThemeContext)
- **Data Fetching**: `@tanstack/react-query`
- **Routing**: React Router v6
- **Dev Tooling**:
  - ESLint flat config (per app)
  - TypeScript project refs
  - Vite + SWC for fast dev/build
- **Monorepo**: npm workspaces (`apps/*`, `packages/*`)
- **Deployment (web)**: GitHub → Cloudflare Pages  
  Build command: `npm run build -w @volleysmart/web`

### High-level Domain

VolleySmart helps **volleyball clubs** manage:

- clubs & membership
- players & positions
- match days, sets, and score tracking
- smart team generation (random-with-constraints, not perfect optimization)
- simple, mobile-first PWA experience

Almost everything is **club-scoped**: you always need a `clubId`.

---

## 🧱 Architecture & File Structure

### Core Principles

- **Monorepo**: shared logic lives in `packages/core`, while UI lives in `apps/web` and `apps/mobile`.
- **Feature-based organization**: components grouped by domain (`auth/`, `clubs/`, `team-generator/`, etc.).
- **Context-driven state**: `AuthContext`, `ClubContext`, `ThemeContext`.
- **Type safety** via TypeScript, using Supabase-generated DB types where possible.
- **Route-based club scoping** via URL params + `ClubContext`.

### Monorepo Layout

Top-level:

```txt
/apps
  /web     # Vite + React (PWA)
  /mobile  # Expo + React Native
/packages
  /core    # shared types, queries, hooks
/supabase  # DB, RLS, functions, migrations
```

## React Version Standardization

The monorepo is fully standardized on:

- **React 19.1.0**
- **React DOM 19.1.0**

Both the web app and the mobile app use the same React version, ensuring:

- No duplicated React copies
- No Metro/Fabric renderer conflicts
- No Vite dedupe issues
- Consistent behavior across shared packages

`packages/core` lists React and React DOM as peerDependencies to prevent accidental duplication.

```txt
volleysmart-app/
├── .DS_Store
├── .gitignore
├── .nvmrc
├── apps
│   ├── mobile
│   │   ├── .gitignore
│   │   ├── .vscode
│   │   ├── app
│   │   ├── app.json
│   │   ├── assets
│   │   ├── components
│   │   ├── constants
│   │   ├── eslint.config.js
│   │   ├── hooks
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── scripts
│   │   └── tsconfig.json
│   └── web
│       ├── .env
│       ├── components.json
│       ├── eslint.config.js
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.js
│       ├─ public/
│       │  ├─ _headers
│       │  ├─ avatar-placeholder.svg
│       │  ├─ favicon.ico
│       │  ├─ favicon.png
│       │  ├─ favicon.svg
│       │  ├─ img-appScreen-dashboard-GameAndScoreTracking.png
│       │  ├─ img-appScreen-editGame-SmartTeamGeneration.png
│       │  ├─ img-appScreen-members-PlayersAndClubsManagement.png
│       │  ├─ img-home-manageClubs-v1.png
│       │  ├─ img-home-scoreboard-v1.png
│       │  ├─ img-home-teamCelebrating.png
│       │  ├─ img-open-graph.png
│       │  ├─ img-volleyball-ball-login-screen.jpg
│       │  ├─ img-volleyball-net.avif
│       │  ├─ img-volleyball-net.jpg
│       │  ├─ img-volleyball-team-v1.png
│       │  ├─ img-volleyball-team-v2.png
│       │  ├─ img-volleyball-team-v3.jpg
│       │  ├─ logo-darkmode.svg
│       │  ├─ logo-lightmode.svg
│       │  ├─ logo-volleySmart - email lightmode.png
│       │  ├─ lovable-uploads/
│       │  │  └─ e54f46fd-5eab-4f09-94df-48c27897b119.png
│       │  ├─ manifest.webmanifest
│       │  ├─ placeholder.svg
│       │  ├─ positions-volleyball-players-en.png
│       │  ├─ robots.txt
│       │  ├─ sw.js
│       │  ├─ volleyball.svg
│       │  └─ icons/
│       │     ├─ apple-touch-icon.png
│       │     ├─ favicon-96x96.png
│       │     ├─ favicon.ico
│       │     ├─ favicon.svg
│       │     ├─ icon-192.png
│       │     ├─ icon-512.png
│       │     ├─ site.webmanifest
│       │     ├─ web-app-manifest-192x192.png
│       │     └─ web-app-manifest-512x512.png
│       ├── src
│       │   ├─ App.css
│       │   ├─ App.tsx
│       │   ├─ index.css
│       │   ├─ main.tsx
│       │   ├─ vite-env.d.ts
│       │   ├─ components/
│       │   │  ├─ admin/
│       │   │  │   └─ UserRoleManager.tsx
│       │   │  ├─ auth/
│       │   │  │   ├─ AuthLayout.tsx
│       │   │  │   └─ ProtectedRoute.tsx
│       │   │  ├─ clubs/
│       │   │  │   ├─ ClubSettingsDialog.tsx
│       │   │  │   └─ CopyableClubId.tsx
│       │   │  ├─ common/
│       │   │  │   ├─ AppLiveRefresh.tsx
│       │   │  │   ├─ EmptyGameState.tsx
│       │   │  │   ├─ Logo.tsx
│       │   │  │   ├─ RealtimeAppEffect.tsx
│       │   │  │   └─ ScrollToTop.tsx
│       │   │  ├─ forms/
│       │   │  │   ├─ CityLocationSelector.tsx
│       │   │  │   └─ LocationSelector.tsx
│       │   │  ├─ home/
│       │   │  │   ├─ CtaSection.tsx
│       │   │  │   ├─ FeaturesSection.tsx
│       │   │  │   ├─ HeroSection.tsx
│       │   │  │   ├─ HowItWorksSection.tsx
│       │   │  │   └─ TestimonialCard.tsx
│       │   │  ├─ layout/
│       │   │  │   ├─ Footer.tsx
│       │   │  │   └─ Navbar.tsx
│       │   │  ├─ match/
│       │   │  │   ├─ AddSetBox.tsx
│       │   │  │   └─ SetBox.tsx
│       │   │  ├─ members/
│       │   │  │   └─ MemberCard.tsx
│       │   │  ├─ nav/
│       │   │  │   ├─ MobileBottomNav.tsx
│       │   │  │   ├─ MobileBottomSpacer.tsx
│       │   │  │   ├─ MobileChrome.tsx
│       │   │  │   ├─ MobileMenuDrawer.tsx
│       │   │  │   ├─ MobileTopBar.tsx
│       │   │  │   └─ ThemePicker.tsx
│       │   │  ├─ routing/
│       │   │  │   ├─ ClubGuard.tsx
│       │   │  │   └─ RoutePersistance.tsx
│       │   │  ├─ team-generator/
│       │   │  │   ├─ EmptyTeamsState.tsx
│       │   │  │   ├─ GeneratedTeams.tsx
│       │   │  │   ├─ PlayerItem.tsx
│       │   │  │   ├─ PlayersEditModal.tsx
│       │   │  │   ├─ PlayersSelection.tsx
│       │   │  │   ├─ SaveMatchDialog.tsx
│       │   │  │   ├─ SortablePlayer.tsx
│       │   │  │   ├─ Star.tsx
│       │   │  │   ├─ TeamEditDialog.tsx
│       │   │  │   ├─ TeamGenerator.ts
│       │   │  │   ├─ TeamTable.tsx
│       │   │  │   ├─ mockData.ts
│       │   │  │   ├─ queries.ts
│       │   │  │   └─ types.ts
│       │   │  └─ ui/
│       │   │      ├─ accordion.tsx
│       │   │      ├─ alert-dialog.tsx
│       │   │      ├─ alert.tsx
│       │   │      ├─ aspect-ratio.tsx
│       │   │      ├─ avatar.tsx
│       │   │      ├─ badge.tsx
│       │   │      ├─ breadcrumb.tsx
│       │   │      ├─ button.tsx
│       │   │      ├─ calendar.tsx
│       │   │      ├─ card.tsx
│       │   │      ├─ carousel.tsx
│       │   │      ├─ chart.tsx
│       │   │      ├─ checkbox.tsx
│       │   │      ├─ collapsible.tsx
│       │   │      ├─ command.tsx
│       │   │      ├─ context-menu.tsx
│       │   │      ├─ dialog.tsx
│       │   │      ├─ drawer.tsx
│       │   │      ├─ dropdown-menu.tsx
│       │   │      ├─ file-input.tsx
│       │   │      ├─ form.tsx
│       │   │      ├─ hover-card.tsx
│       │   │      ├─ input-otp.tsx
│       │   │      ├─ input.tsx
│       │   │      ├─ label.tsx
│       │   │      ├─ menubar.tsx
│       │   │      ├─ navigation-menu.tsx
│       │   │      ├─ pagination.tsx
│       │   │      ├─ popover.tsx
│       │   │      ├─ progress.tsx
│       │   │      ├─ radio-group.tsx
│       │   │      ├─ resizable.tsx
│       │   │      ├─ scroll-area.tsx
│       │   │      ├─ select.tsx
│       │   │      ├─ separator.tsx
│       │   │      ├─ sheet.tsx
│       │   │      ├─ sidebar.tsx
│       │   │      ├─ skeleton.tsx
│       │   │      ├─ slider.tsx
│       │   │      ├─ sonner.tsx
│       │   │      ├─ spinner.tsx
│       │   │      ├─ switch.tsx
│       │   │      ├─ table.tsx
│       │   │      ├─ tabs.tsx
│       │   │      ├─ textarea.tsx
│       │   │      ├─ theme-toggle.tsx
│       │   │      ├─ toast.tsx
│       │   │      ├─ toaster.tsx
│       │   │      ├─ toggle-group.tsx
│       │   │      ├─ toggle.tsx
│       │   │      ├─ tooltip.tsx
│       │   │      └─ use-toast.ts
│       │   ├─ contexts/
│       │   │   ├─ AuthContext.tsx
│       │   │   ├─ ClubContext.tsx
│       │   │   └─ ThemeContext.tsx
│       │   ├─ features/
│       │   │   └─ teams/
│       │   │      └─ positions.ts
│       │   │      └─ assignLineup.ts
│       │   ├─ hooks/
│       │   │   ├─ use-compact.tsx
│       │   │   ├─ use-ios-pwa-keyboard-repaint.ts
│       │   │   ├─ use-mobile.tsx
│       │   │   ├─ use-toast.tsx
│       │   │   └─ useIsAdmin.ts
│       │   ├─ integrations/
│       │   │   └─ supabase/
│       │   │      ├─ client.ts
│       │   │      ├─ club.ts
│       │   │      ├─ clubMembers.ts
│       │   │      ├─ matchDays.ts
│       │   │      ├─ members.ts
│       │   │      ├─ players.ts
│       │   │      ├─ positions.ts
│       │   │      ├─ profiles.ts
│       │   │      ├─ schemas.sql
│       │   │      ├─ storage.ts
│       │   │      └─ types.ts
│       │   ├─ lib/
│       │   │   ├─ formatName.ts
│       │   │   └─ utils.ts
│       │   ├─ pages/
│       │   │   ├─ Admin.tsx
│       │   │   ├─ Clubs.tsx
│       │   │   ├─ Dashboard.tsx
│       │   │   ├─ EditGame.tsx
│       │   │   ├─ ForgotPassword.tsx
│       │   │   ├─ GameDetail.tsx
│       │   │   ├─ Games.tsx
│       │   │   ├─ Home.tsx
│       │   │   ├─ InviteMembers.tsx
│       │   │   ├─ JoinClub.tsx
│       │   │   ├─ Login.tsx
│       │   │   ├─ ManageMembers.tsx
│       │   │   ├─ Members.tsx
│       │   │   ├─ NewClub.tsx
│       │   │   ├─ NewGame.tsx
│       │   │   ├─ NotFound.tsx
│       │   │   ├─ PlayerDetail.tsx
│       │   │   ├─ PlayerOnboarding.tsx
│       │   │   ├─ Players.tsx
│       │   │   ├─ Profile.tsx
│       │   │   ├─ ResetPassword.tsx
│       │   │   ├─ Signup.tsx
│       │   │   ├─ Start.tsx
│       │   │   ├─ TeamGenerator.tsx
│       │   │   └─ VerifyEmail.tsx
│       │   ├─ routes/
│       │   │   └─ AppRoutes.tsx
│       │   ├─ types/
│       │   │   └─ upabase.ts
│       │   ├─ utils/
│       │   │   └─ buildImageUrl.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── claude-setup
│   ├── .claude
│   │   ├── commands
│       │   ├─ analyze-performance.md
│       │   ├─ execute-parallel.md
│       │   ├─ execute-prp.md
│       │   ├─ fix-github-issue.md
│       │   ├─ generate-prp.md
│       │   ├─ prep-parallel.md
│       │   └─ primer.md
│   │   └── settings.local.json
│   ├── Claude.md
│   └── project-structure.tree
├── package-lock.json
├── package.json
├── packages
│   └── core
│       ├── package.json
│       ├── src
│       │   └─ index.ts
│       └── tsconfig.json
├── project-plan
│   ├── API-design.md
│   ├── API-endpoints-overview.md
│   ├── prd-product-requirements-document.md
│   ├── roadmap.md
│   ├── srs-software-requirements-specification.md
│   └── supabase-schema.md
├── README.md
└── supabase
    ├── .temp
    │   ├── cli-latest
    │   ├── gotrue-version
    │   ├── pooler-url
    │   ├── postgres-version
    │   ├── project-ref
    │   ├── rest-version
    │   ├── storage-migration
    │   └── storage-version
    ├── config.toml
    ├── functions
    │   └── send-club-invitations
    │       └─ index.ts
    └── migrations
        └── 20251017113742_b86b220e-81cc-47ec-9c41-415df62a13d2.sql

```

#### apps/web

- Vite + React + TS entry: `apps/web/src/main.tsx` → `App.tsx`.
- UI structured into:
  - `components/` – feature & UI components (auth, clubs, nav, ui, etc.)
  - `contexts/` – `AuthContext`, `ClubContext`, `ThemeContext`
  - `routes/` – `AppRoutes.tsx`
  - `pages/` – actual route pages (`Dashboard`, `Players`, `TeamGenerator`, etc.)
  - `integrations/supabase/` – all Supabase helpers and types
  - `features/teams/` – smart team generation logic
  - `hooks/`, `lib/`, `utils/` – shared app utilities

Path alias:

- `@` → `apps/web/src`
- Configured in `apps/web/vite.config.ts`.

#### apps/mobile

- Expo / React Native scaffold (early).
- Auth screen in `apps/mobile/app/(auth)/login.tsx` uses Supabase auth and `expo-auth-session` for Google OAuth.
- Not currently deployed; you can mostly ignore it when working on web/PWA features.

#### packages/core

- Shared TS module used by web (and in future, mobile).
- Does not include its own React copy.

`packages/core/package.json` (important bits):

```jsonc
{
  "name": "@volleysmart/core",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "sideEffects": false,
  "scripts": {
    "build": "tsc -b"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

> Rule: keep `@volleysmart/core` React-agnostic or treat React as a _peer dependency_, never bundle a second React instance.

### Routing Requirements for Apps

To ensure the app renders correctly:

- The main app layout must be in:
  apps/mobile/app/\_layout.tsx

- Tab navigation must live inside:
  apps/mobile/app/(tabs)/\_layout.tsx

- The default tab screen must be:
  apps/mobile/app/(tabs)/index.tsx

If `index.tsx` is renamed or removed, Expo Router cannot mount the app and the splash screen will remain visible.

## Mobile App (Expo)

The mobile app lives in /apps/mobile with Expo Router, React Native, and shared code from packages/core.

### Environment Variables (Expo)

Expo does not read .env files from the project root.

All mobile environment variables must be placed in:

```bash
apps/mobile/.env

Required keys:

EXPO_PUBLIC_SUPABASE_URL=<your supabase url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your supabase anon key>

Notes:
- Only variables prefixed with `EXPO_PUBLIC_` are available in the app.
- `VITE_` variables from the web app do NOT work in mobile.
- `apps/mobile/.env` is gitignored and must not be committed.

```

## 🔧 Tooling & Build System

### Root `package.json`

Key points:

- Uses npm workspaces:

```jsonc
{
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=20.19.0" },
  "overrides": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "rollup": "^4.24.0"
  }
}
```

- The `overrides` are important:
  - Force a single version of React / ReactDOM across workspaces.
  - Pin Rollup to a version that works with Vite + ROLLUP_SKIP_NODEJS_NATIVE on Cloudflare Pages.

Top-level scripts (mainly helpers):

```jsonc
"scripts": {
  "dev:web": "npm run dev -w @volleysmart/web",
  "build:web": "npm run build -w @volleysmart/web",
  "preview:web": "npm run preview -w @volleysmart/web",
  "dev:mobile": "npm run start -w @volleysmart/mobile"
}
```

### apps/web: Vite config

`apps/web/vite.config.ts`:

- Uses SWC React plugin.
- Dedupe React to avoid multiple copies (especially when using `packages/core`).
- Alias `@` to `src`.

Rough structure (do not remove the dedupe/optimizeDeps bits):

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
```

> If you change Vite config, keep the React dedupe + optimizeDeps unless you know exactly why you’re removing them.

### apps/web: package.json scripts

`apps/web/package.jso` relevant part:

```jsonc
"scripts": {
  "dev": "vite",
  "build": "cross-env ROLLUP_SKIP_NODEJS_NATIVE=1 vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint -c ./eslint.config.js .",
  "preview": "vite preview"
}
```

The critical piece is:

```bash
cross-env ROLLUP_SKIP_NODEJS_NATIVE=1 vite build
```

This disables Rollup’s native binary, which avoids the `@rollup/rollup-linux-x64-gnu` optional-dependency bug on Cloudflare’s build environment.

> Do not “simplify” this to just vite build in the future unless you also solve the Rollup native issue another way.

## ✅ ESLint & TypeScript

### ESLint

- Each app has its own flat config (`eslint.config.js`).
- For `apps/web`, ESLint is set up to:
  - Use TypeScript with type-aware rules for `src/**`.
  - Use a lighter config for tooling files (e.g. `vite.config.ts`, `tailwind.config.ts`).

Script:

```bash
npm run lint -w @volleysmart/web
```

> Lint failures do not currently block the Cloudflare build; Cloudflare only runs the build script.
> Lint is used locally to catch issues, but not enforced in CI.

### TypeScript

- `apps/web` has `tsconfig.json` + `tsconfig.app.json` etc.
- `packages/core` has its own `tsconfig.json` and uses project references (`tsc -b`).

When modifying core:

```bash
npm run build -w @volleysmart/core
# or rely on TS project references / Vite to rebuild during dev
```

## 🔐 Authentication & Routing (web)

### Core invariants

- `isAuthenticated` is derived from `!!user`, never a separate boolean kept in sync manually.
- `AuthContext` is the single source of truth for user, session, and loading state.
- `getUserProfile()`:
  - Fetches profile from Supabase and sets `user`.
  - Does not toggle `isLoading`.

### Loading ownership:

- **Boot / hard refresh**:
  - `isLoading = true`
  - `supabase.auth.getSession()` → if session:
  - `getUserProfile()` → sets `user`
  - `isLoading = false` only at the end.
- **Login flow**:
  - `login()` sets `isLoading = true`
  - `signInWithPassword()` → `getSession()` → `getUserProfile()`
  - `isLoading = false`
- **onAuthStateChange**:
  - Only handles `SIGNED_OUT` (clear user & loading).
  - Does not navigate or re-fetch profile on `SIGNED_IN` / `TOKEN_REFRESHED`.
- **Routing & deep links**
- `ProtectedRoute`:
  - Redirects unauthenticated users to `/login`.
  - Passes state: `{ from: location }`.
- `Login`:
- If `state.from` is present (and valid), navigate back there after login.
- Else runs the `onboarding/club` redirection logic:
  - no player row → `/players/onboarding`
  - zero clubs → `/start`
  - one club → `/dashboard/:clubId`
  - multiple clubs → last visited club if valid, else `/clubs`

> **Rule**: Providers (contexts) must not use `useNavigate`. Use hard redirects (`window.location.href`) if a provider must force navigation.

## 🏢 Club Context & Scoping

- `ClubContext` manages current `clubId`.
- On club routes, `clubId` is read from URL params and written into context.
- `localStorage` stores `lastVisitedClub` so the app can choose a default club if needed.

Pattern:

```ts
const { clubId: urlClubId } = useParams<{ clubId: string }>();
const { clubId, setClubId } = useClub();

useEffect(() => {
  if (urlClubId) setClubId(urlClubId);
}, [urlClubId, setClubId]);
```

All Supabase queries must be scoped to a club one way or another.

## 🗄️ Supabase Integration (web)

- All Supabase client code is under `apps/web/src/integrations/supabase/`.
  - `client.ts` – Supabase client instance.
  - `types.ts` – generated types for tables.
  - `club.ts`, `players.ts`, `clubMembers.ts`, etc. – feature-specific queries.

Typical pattern:

```ts
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase
  .from("players")
  .select(
    `
    *,
    player_positions (
      is_primary,
      positions (name)
    )
  `
  )
  .eq("user_id", userId);

if (error) {
  console.error("Supabase error:", error);
  throw error;
}
```

RLS is enforced at DB level; functions and queries must be written assuming only club members see club data.

## 🎯 Component & Feature Patterns

- Prefer **feature folders** under `components/` and `pages/`.
- Use `shadcn/ui` components from `components/ui/`.
- Tailwind for layout & styling.

Standard page skeleton:

```tsx
const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const { clubId } = useClub();

  const { data, isLoading: isDataLoading } = useQuery({
    queryKey: ["dashboard", clubId],
    queryFn: () => fetchDashboard(clubId),
    enabled: !!clubId && !!user,
  });

  if (isLoading || isDataLoading) return <Spinner />;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{/* content */}</main>
    </div>
  );
};
```

## 🚀 Deployment & CI/CD (Cloudflare Pages)

### What Cloudflare runs (web)

- Build command: `npm run build -w @volleysmart/web`
- Output directory: `apps/web/dist`

The important part is inside `apps/web/package.json`:

```jsonc
"build": "cross-env ROLLUP_SKIP_NODEJS_NATIVE=1 vite build"
```

Cloudflare Pages will:

1. Install dependencies (`npm ci` / `npm clean-install`).
2. Run `npm run build -w @volleysmart/web`.
3. Serve `apps/web/dist`.

> If a future change reintroduces `@rollup/rollup-*-gnu` errors, check:
>
> - Root `package.json` `overrides.rollup`.
> - `apps/web` build script still uses `ROLLUP_SKIP_NODEJS_NATIVE=1`.

## 🔧 Development Commands (summary)

At repo root:

```bash
# Install dependencies
npm install

# Web dev server
npm run dev:web         # ⇒ runs `vite` in apps/web

# Web build & preview
npm run build:web
npm run preview:web

# Lint web app
npm run lint -w @volleysmart/web

# Mobile dev (Expo) – early stage
npm run dev:mobile
```

## 📋 Best Practices for LLMs working on this repo

1. **Respect the monorepo structure.**

- Web-specific changes → `apps/web`
- Mobile-specific changes → `apps/mobile`
- Shared logic → `packages/core` (React as peer dep).

2. **Do not break the build pipeline.**

- Kee` `cross-env ROLLUP_SKIP_NODEJS_NATIVE=1 vite bui` ` intact unless you fully understand the Rollup change.
- Kee` `overrid` ` fo` `rea` `` `react-d` `, an` `roll` ` i` `ro` ` `package.js` `.

3. **Always consider club scoping.**

- New queries should be club-aware and RLS-compatible.
- Navigation should keep `clubId` in the URL where appropriate.

4. **Avoid navigation from providers.**

- Use `window.location.href` if a provider truly needs to redirect.
- Leave route-level navigation to components and pages.

5. **Prefer existing patterns.**

- Copy patterns from existing `pages/components` (auth flow, team generator, members list, etc.).
- Use shadcn/ui components from `components/ui` instead of inventing new primitives.

6. **When in doubt, log.**

- Temporary `console.log` in contexts, routing logic, and Supabase integration is acceptable during debugging.
- Remove noisy logs in final changes.
