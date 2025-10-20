# CLAUDE.md

This file provides guidance to Code within this application when working with code in this repository.

This file provides comprehensive guidance to any LLM and Vibe Coding App when working with the VolleySmart volleyball club and match management web app.

## 🏐 Project Overview

VolleySmart is a React-based web application for managing volleyball clubs, teams, and matches. Built with modern TypeScript, Supabase backend, and deployed via Lovable and local machine.

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI primitives
- **Backend**: Supabase (Auth, Database, Storage, RLS)
- **State Management**: React Context API (AuthContext, ClubContext)
- **Data Fetching**: @tanstack/react-query
- **Routing**: React Router v6
- **Development**: ESLint + Vite SWC
- **Deployment**: GitHub → Auto-deploy to Lovable

## 🧱 Architecture & File Structure

### Core Principles

- **Feature-based organization** - Components grouped by domain (auth/, clubs/, members/, etc.)
- **Context-driven state** - AuthContext and ClubContext manage global state
- **Type safety with flexibility** - TypeScript with relaxed settings for rapid development
- **Component composition** - Extensive use of shadcn/ui primitives
- **Route-based club scoping** - All views depend on clubId from URL parameters

### Project Structure

```
src/
├── components/          # Feature-organized components
│   ├── admin/          # Admin-only components
│   ├── auth/           # Authentication components
│   ├── clubs/          # Club management
│   ├── common/         # Shared components
│   ├── forms/          # Form, layout
│   ├── home/           # Homepage Sections components
│   ├── layout/         # Navigation, layout
│   ├── match/          # Match Overview, layout
│   ├── members/        # Member management
│   ├── team-generator/ # Team generation logic
│   └── ui/             # shadcn/ui components
├── contexts/           # React Context providers
├── hooks/              # Custom hooks
├── integrations/       # Supabase integration
├── lib/                # Utilities
├── pages/              # Page components
├── types/              # TypeScript types
├── App.tsx/            # App router page
└── main.tsx            # App entry point
```

## Auth & Routing — Source of Truth and Invariants

### Core invariants

- `isAuthenticated` is **derived**: `!!user`. Do not keep a separate boolean state.
- `getUserProfile(user)` **does not** toggle `isLoading`. It only sets `user` (or a fallback).
- Only **one place** controls `isLoading` at a time:
  - **App boot / hard refresh**: the init effect (`supabase.auth.getSession()` → `getUserProfile()` → `isLoading=false`).
  - **Interactive login**: the `login()` function resolves the session, calls `getUserProfile()`, then sets `isLoading=false`.
  - **Auth listener** handles **SIGNED_OUT** only. It does **not** fetch profile or change loading for `SIGNED_IN`/`TOKEN_REFRESHED`.
- Providers (e.g., `AuthProvider`) must **not** call `useNavigate`. Providers can mount outside `<Router>`; use `window.location.href` for hard redirects from providers when necessary.

### Boot sequence (cold start / hard refresh)

1. `isLoading = true`.
2. `getSession()`.
   - If **no session**: `user = null`, `isLoading = false`.
   - If **session**: `getUserProfile()` → sets `user`, then `isLoading = false`.
3. No redirects occur during boot; deep links render once `isLoading=false`.

### Auth listener (onAuthStateChange)

- **SIGNED_OUT**: clear `session`, `user = null`, `isLoading = false`.
- **SIGNED_IN** / **TOKEN_REFRESHED**: **ignored** for loading and navigation. We do not fetch profile here (boot and login own it). If you decide to read profile on refresh, do it **without** toggling loading and only when `user` is null.

### Login flow

- `login(email, password)`:
  - Sets `isLoading = true`.
  - `signInWithPassword()` → `getSession()` → `getUserProfile()` → `isLoading = false`.
- `ProtectedRoute` redirects unauthenticated users to `/login` with `state: { from: location }`.
- `Login` page:
  - If `location.state.from` is present and not `/login` or bare `/dashboard`, navigate **back to it**.
  - Else run onboarding/club selection flow:
    - If no `players` row: `/players/onboarding`
    - If 0 clubs: `/start`
    - If 1 club: `/dashboard/:clubId`
    - If many clubs: `/dashboard/:lastVisitedClub` if valid, else `/clubs`

### Signup flow

- `signup()` must establish an authenticated session immediately after account creation:
  - Call `auth.signUp(...)`.
  - If no session returned (depending on email confirmation settings), **sign in once** with the same credentials.
  - `getSession()` → `getUserProfile()` → `user` set.
  - The `Signup` page then redirects via the same onboarding/club logic as Login.

### Logout behavior

- `logout()` clears local auth state and uses a **hard redirect** (`window.location.href = "/"`) from within providers (no `useNavigate` in providers).

### Routing & deep links

- `ProtectedRoute` must pass `state={{ from: location }}` when redirecting to `/login`.
- `Login` must **normalize** invalid “from” paths (e.g., treat bare `/dashboard` as “no from”) to avoid 404s. Use only `/dashboard/:clubId`.
- Avoid global navigations on app mount (e.g., do not navigate from `Navbar` or layout to dashboard unconditionally).

### Common pitfalls (and what to avoid)

- Do **not** set `isLoading=false` while a session exists **before** `user` is set → causes a detour to `/login`.
- Do **not** toggle `isLoading` inside `getUserProfile`.
- Do **not** navigate on any auth event other than explicit user actions.
- Do **not** use `useNavigate` inside providers.

### Testing checklist

- Hard refresh on `/members/:clubId` stays on the same route; no login flash.
- Logout → login as different user returns to `from` or runs onboarding/club flow correctly.
- Signup → lands in onboarding automatically without manual login.
- Idle tab / token refresh produces no navigation or loading flicker.

## 🔐 Authentication & Authorization

### Auth Flow

- **AuthContext** manages user state, login/logout, and profile data
- **ProtectedRoute** component handles route-level authorization
- **Role-based access**: admin, editor, member, user
- **Session persistence** via Supabase Auth with localStorage

### Key Auth Patterns

```typescript
// Use auth in components
const { user, isAuthenticated, isLoading } = useAuth();

// Protect routes with roles
<ProtectedRoute allowedRoles={["admin", "editor"]}>
  <AdminComponent />
</ProtectedRoute>;

// Check auth state
if (!isAuthenticated) return <Navigate to="/login" />;
```

## 🏢 Club Context & Scoping

### Club Context Pattern

- **ClubContext** manages current club scope
- **URL-based club selection** - clubId from route parameters
- **localStorage persistence** - remembers last visited club
- **All data queries scoped to current club**

### Key Club Patterns

```typescript
// Access club context
const { clubId, setClubId, clearClubId } = useClub();

// Set club from URL params
const { clubId: urlClubId } = useParams<{ clubId: string }>();
useEffect(() => {
  if (urlClubId) setClubId(urlClubId);
}, [urlClubId, setClubId]);

// Club-scoped queries
const { data } = useQuery({
  queryKey: ["clubData", clubId],
  queryFn: () => fetchClubData(clubId),
  enabled: !!clubId,
});
```

## 🗄️ Supabase Integration

### Database Schema Overview

- **clubs** - Club information and settings
- **club_members** - User-club relationships with roles
- **players** - Player profiles (linked to clubs)
- **match_days** - Game sessions
- **matches** - Individual match results
- **game_players** - Player-team assignments for matches

### RLS (Row Level Security) Patterns

```sql
-- Players visible only to club members
EXISTS (
  SELECT 1 FROM club_members me
  JOIN club_members them ON me.club_id = them.club_id
  WHERE me.user_id = auth.uid()
  AND them.user_id = players.user_id
)
```

### Common Query Patterns

```typescript
// Club-scoped data fetching
const { data: players } = await supabase
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
  .eq("club_id", clubId);

// Error handling
if (error) {
  console.error("Supabase error:", error);
  throw error;
}
```

## 🎯 Component Patterns

### Page Component Structure

```typescript
// Standard page component pattern
const Dashboard = () => {
  const { user } = useAuth();
  const { clubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();

  // Sync URL clubId with context
  useEffect(() => {
    if (urlClubId) setClubId(urlClubId);
  }, [urlClubId, setClubId]);

  // Club-scoped queries
  const { data, isLoading } = useQuery({
    queryKey: ["data", clubId],
    queryFn: () => fetchData(clubId),
    enabled: !!clubId && !isCheckingClub,
  });

  // Loading states
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">{/* Page content */}</main>
    </div>
  );
};
```

### Data Fetching Patterns

```typescript
// React Query with proper keys
const { data: clubData } = useQuery({
  queryKey: ["club", clubId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single();

    if (error) throw error;
    return data;
  },
  enabled: !!clubId,
});

// Invalidate queries after mutations
await queryClient.invalidateQueries({
  queryKey: ["club", clubId],
});
```

## 🐛 Common Debugging Patterns

### Context Debugging

```typescript
// Add strategic logging for context issues
useEffect(() => {
  console.log("🏐 ClubContext Debug:", { clubId, urlClubId });
}, [clubId, urlClubId]);

// Check auth state
useEffect(() => {
  console.log("👤 Auth Debug:", { user, isAuthenticated, isLoading });
}, [user, isAuthenticated, isLoading]);
```

### Navigation Debugging

```typescript
// Route debugging
console.log("📍 Current route:", window.location.pathname);
console.log("🎯 Navigating to:", `/dashboard/${clubId}`);

// Ensure clubId is in navigation
navigate(`/members/${clubId}`);
```

### Supabase RLS Debugging

```typescript
// Check RLS policies when queries fail
const { data, error } = await supabase
  .from("players")
  .select("*")
  .eq("club_id", clubId);

if (error) {
  console.error("🔒 RLS Policy Error:", error);
  console.log("🔍 Debug info:", { clubId, userId: user?.id });
}
```

## 🚨 Known Issues & Solutions

### Issue: ClubContext not persisting

**Symptoms**: clubId resets on page refresh  
**Solution**: Check localStorage persistence and URL param sync

```typescript
// Ensure proper URL param handling
const { clubId: urlClubId } = useParams<{ clubId: string }>();
useEffect(() => {
  if (urlClubId) {
    setClubId(urlClubId);
  }
}, [urlClubId, setClubId]);
```

### Issue: RLS blocking player queries

**Symptoms**: Empty results despite data existing  
**Solution**: Verify club membership and RLS policies

```typescript
// Debug club membership
const { data: membership } = await supabase
  .from("club_members")
  .select("role")
  .eq("club_id", clubId)
  .eq("user_id", user.id)
  .single();
```

### Issue: Navigation losing clubId

**Symptoms**: Routes not preserving club context  
**Solution**: Always include clubId in navigation

```typescript
// ❌ Wrong - loses club context
navigate("/members");

// ✅ Correct - preserves club context
navigate(`/members/${clubId}`);
```

## 🎨 Styling & UI Patterns

### Tailwind + shadcn/ui Patterns

```typescript
// Standard layout pattern
<div className="min-h-screen flex flex-col">
  <Navbar />
  <main className="flex-grow">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Content */}
    </div>
  </main>
</div>

// Card components
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Theme Support

- Dark mode via ThemeContext
- Consistent color scheme with volleyball-primary brand color
- Responsive design with mobile-first approach

## 🧪 Development Guidelines

### Component Development

```typescript
// Component interface pattern
interface ComponentProps {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    // ... other properties
  };
}

export const Component = ({ member }: ComponentProps) => {
  // Component logic
  return <div>{/* JSX */}</div>;
};
```

### Error Handling

```typescript
// Standard error handling
try {
  const result = await supabaseOperation();
  return result;
} catch (error) {
  console.error("Operation failed:", error);
  toast({
    title: "Error",
    description: "Operation failed. Please try again.",
    variant: "destructive",
  });
  throw error;
}
```

### TypeScript Patterns

```typescript
// Use database types
import { Tables } from "@/types/supabase";
type Player = Tables<"players">;

// Extend types as needed
interface PlayerWithPositions extends Player {
  player_positions: Array<{
    is_primary: boolean;
    positions: { name: string };
  }>;
}
```

## 🚀 Deployment & CI/CD

### GitHub → Lovable Flow

- **Push to main** triggers auto-deployment
- **Development builds** available via `npm run build:dev`
- **Component tagging** via lovable-tagger (currently disabled)

### Environment Variables

- Supabase URL and keys managed by Lovable
- No manual environment setup required

### Storage Requirements

- **Manual bucket creation required** - `player-images` and `club-images` buckets must be created manually in Supabase
- **Dynamic bucket creation disabled** due to RLS policies
- **Storage API errors suppressed** - App.tsx includes fetch interception to handle bucket creation errors gracefully

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server on :8080

# Building
npm run build           # Production build
npm run build:dev       # Development build (with development mode)
npm run preview         # Preview production build

# Code Quality
npm run lint            # ESLint check (no test commands available)

# Setup
npm i                   # Install dependencies
```

## 🧪 Testing & Quality Assurance

- **No test framework configured** - project does not include Jest, Vitest, or other testing libraries
- **ESLint configuration** includes TypeScript rules with relaxed unused variables setting
- **No TypeScript strict mode** - @typescript-eslint/no-unused-vars is disabled
- **Component tagging disabled** - lovable-tagger is commented out in vite.config.ts

## 📋 Best Practices for Claude

### When Debugging Issues

1. **Always ask for specific error messages** and browser console output
2. **Check clubId context** - most issues stem from missing club scope
3. **Verify authentication state** - ensure user is logged in and has proper roles
4. **Review Supabase RLS policies** - common source of data access issues
5. **Insert strategic console.log statements** to trace data flow

### When Implementing Features

1. **Follow existing patterns** - use established component and context patterns
2. **Scope to clubs** - ensure all new features respect club boundaries
3. **Handle loading states** - use Spinner component for async operations
4. **Include proper error handling** - toast notifications for user feedback
5. **Maintain type safety** - use existing TypeScript interfaces

### When Modifying Navigation

1. **Always include clubId** in route parameters
2. **Update route definitions** in App.tsx if adding new routes
3. **Test ProtectedRoute logic** for role-based access
4. **Verify context persistence** across navigation

### Code Style Guidelines

- **Use existing component patterns** from shadcn/ui
- **Follow Tailwind CSS conventions** for styling
- **Maintain consistent error handling** with toast notifications
- **Use React Query** for all server state management
- **Implement proper loading states** for better UX

## 🚨 Critical Debugging Checklist

When encountering issues, always check:

- [ ] Is user authenticated? (`useAuth()`)
- [ ] Is clubId set correctly? (`useClub()`)
- [ ] Are route parameters correct? (`useParams()`)
- [ ] Do Supabase queries include proper clubId filtering?
- [ ] Are RLS policies allowing access for the current user?
- [ ] Is React Query cache properly invalidated after mutations?
- [ ] Are navigation links including clubId in the path?

---

**Remember**: This is a club-scoped application where almost all functionality depends on the current club context. Always verify clubId is properly set and propagated through the application.
