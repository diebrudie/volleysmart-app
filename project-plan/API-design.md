# Data Access Design

## 1. Architecture Overview

VolleyMatch uses **direct Supabase client queries** instead of traditional REST API endpoints. This provides type-safe database operations, real-time subscriptions, and automatic Row Level Security enforcement.

### 1.1 Data Access Pattern

```typescript
// Direct Supabase queries with TypeScript types
const { data, error } = await supabase
  .from("players")
  .select("*, player_positions(*, positions(*))")
  .eq("club_id", clubId)
  .eq("is_active", true);
```

### 1.2 Key Benefits

Type Safety: Auto-generated TypeScript types from database schema
Real-time: Built-in subscriptions for live data updates
Security: Row Level Security policies enforce data access rules
Performance: Optimized queries with built-in caching
Simplicity: No API layer to maintain or debug

## 2. Data Access Modules

These are the actual functions in your codebase that handle database operations:

### 2.1 Authentication (src/integrations/supabase/profiles.ts)

```
typescript// User profile management functions you already have
createUserProfile(user: User, role: UserRole) → UserProfile
getUserProfile(userId: string) → UserProfile
updateUserRole(userId: string, role: UserRole) → UserProfile
```

### 2.2 Club Management (src/integrations/supabase/club.ts)

```
typescript// Club administration functions you already have
addClubAdmin(clubId: string, userId: string) → void
```

### 2.3 Player Management (src/integrations/supabase/players.ts)

```
typescript// Player lifecycle operations you already have
createPlayer(userId: string, playerData: PlayerData) → Player
getPlayerByUserId(userId: string) → Player
getAllPlayers() → Player[]
updatePlayer(playerId: string, playerData: Partial<PlayerData>) → Player
updatePlayerPositions(playerId: string, primaryId: string, secondaryIds: string[]) → boolean
```

### 2.4 Position Management (src/integrations/supabase/positions.ts)

```
typescript// Volleyball position operations you already have
getAllPositions() → Position[]
getPositionById(id: string) → Position
getPositionByName(name: string) → Position | null
ensurePositionsExist() → boolean
```

### 2.5 Storage Management (src/integrations/supabase/storage.ts)

```
typescript// File upload utilities you already have
getPublicUrl(bucketName: string, filePath: string) → string
```

## 3. Database Functions

### 3.1 Security Functions

Supabase database functions handle complex authorization logic:

```
-- Club membership verification
is_club_member(club_uuid: string, user_uuid: string) → boolean
is_club_admin(club_uuid: string, user_uuid: string) → boolean
is_club_admin_or_editor(club_uuid: string, user_uuid: string) → boolean

-- Profile access
can_view_profile(viewed_user_id: string) → boolean
user_can_view_club_members(target_club_id: string) → boolean

-- Data integrity
club_has_members(club_uuid: string) → boolean
delete_match_day_with_matches(match_day_id: string) → void
```

### 3.2 Admin Functions

```
-- Security definer functions for admin operations
is_club_admin_safe(club_uuid: string, user_uuid: string) → boolean
is_club_admin_secure(club_uuid: string, user_uuid: string) → boolean
is_club_creator(input_club_id: string, input_user_id: string) → boolean
```

## 4. Row Level Security Policies

### 4.1 Club-Scoped Data Access

All club-related data is protected by RLS policies that verify club membership:

```
-- Example: Players table policy
CREATE POLICY "Members can view club players" ON players
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = players.club_id
    AND user_id = auth.uid()
    AND is_active = true
  )
);
```

### 4.2 Role-Based Operations

```
-- Example: Admin-only operations
CREATE POLICY "Admins can manage players" ON players
FOR ALL USING (
  is_club_admin(club_id::text, auth.uid()::text)
);
```

## 5. Real-Time Subscriptions

### 5.1 Live Data Updates

```
// Real-time match score updates
const subscription = supabase
  .from('matches')
  .on('*', (payload) => {
    // Handle real-time changes
    updateMatchScores(payload.new);
  })
  .subscribe();
```

### 5.2 Club Context Updates

```
// Listen for club member changes
const membershipSubscription = supabase
  .from('club_members')
  .on('*', (payload) => {
    // Refresh user's club list
    refreshClubMemberships();
  })
  .subscribe();
```

## 6. Error Handling

### 6.1 Common Error Patterns

```
// Standardized error handling (like in your players.ts)
try {
  const { data, error } = await supabase
    .from('players')
    .insert(playerData);

  if (error) {
    console.error('Database error:', error);
    throw error;
  }

  return data;
} catch (error) {
  // Handle specific error types
  if (error.code === '23505') {
    throw new Error('Player already exists');
  }
  throw error;
}
```

### 6.2 RLS Policy Violations

```
// Handle insufficient permissions
if (error?.code === '42501') {
  throw new Error('Insufficient permissions for this operation');
}
```

## 7. Performance Optimizations

### 7.1 Query Optimization

```
// Use select() to fetch only needed fields (like you do in players.ts)
const { data } = await supabase
  .from('players')
  .select('id, first_name, last_name, skill_rating')
  .eq('is_active', true);

// Use single() for unique results (like you do in players.ts)
const { data } = await supabase
  .from('clubs')
  .select('*')
  .eq('id', clubId)
  .single();
```

### 7.2 Batch Operations

```
// Bulk insert for efficiency
const { error } = await supabase
  .from('game_players')
  .insert(teamAssignments);
```

## 8. Type Safety

### 8.1 Generated Types

```
// Auto-generated from database schema (your types.ts file)
export type Database = {
  public: {
    Tables: {
      players: {
        Row: { /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // ... other tables
    }
  }
}
```

### 8.2 Helper Types

```
// Convenient type aliases (like in your supabase.ts)
export type Player = Database['public']['Tables']['players']['Row'];
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];
export type PlayerUpdate = Database['public']['Tables']['players']['Update'];
```

## 9. Development Workflow

### 9.1 Schema Changes

1. Update database schema in Supabase Dashboard
2. Run npx supabase gen types typescript to regenerate types
3. Update application code to use new schema
4. Test RLS policies with different user roles

### 9.2 Local Development

```
# Generate types after schema changes (what you just did)
npx supabase gen types typescript --project-id PROJECT_ID > src/integrations/supabase/types.ts

# Test database functions
npx supabase db functions serve --env-file .env.local
```

## 10. Security Best Practices

### 10.1 Data Access Rules

- All queries automatically respect RLS policies
- Club membership verified before data access
- User identity checked via auth.uid() in policies
- Sensitive data (skill_rating) hidden from players

### 10.2 Input Validation

- TypeScript types prevent invalid data shapes
- Database constraints ensure data integrity
- Client-side validation for user experience
- Server-side validation via RLS and functions

## 11. Current Implementation Files

### 11.1 Core Data Access Files

- `src/integrations/supabase/client.ts` - Supabase client configuration
- `src/integrations/supabase/types.ts` - Auto-generated database types
- `src/integrations/supabase/players.ts` - Player CRUD operations
- `src/integrations/supabase/positions.ts` - Position management
- `src/integrations/supabase/profiles.ts` - User profile operations
- `src/integrations/supabase/club.ts` - Club administration
- `src/integrations/supabase/storage.ts` - File upload utilities
- `src/integrations/supabase/schemas.sql` - Additional schema setup

### 11.2 React Integration

- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/contexts/ClubContext.tsx` - Club context switching
- `src/hooks/use-toast.tsx` - Toast notifications
- Components use direct Supabase queries with React Query for caching
