# Software Requirements Specification (SRS)

## 1. Introduction

Defines the software requirements for VolleyMatch, a **club-centric** volleyball management web application that enables multi-club membership, player onboarding, team generation, match day management, and role-based access control.

## 2. Functional Requirements

### 2.1 Core Features

- **FR-001** – Multi-club authentication and user management via Supabase Auth
- **FR-002** – Player profile creation and onboarding after signup
- **FR-003** – Club creation, joining, and management with role-based permissions
- **FR-004** – Match day creation and management within club context
- **FR-005** – Intelligent team generation based on player positions and skill ratings
- **FR-006** – Multi-game match scoring and result tracking (up to 5 games per day)
- **FR-007** – Player activation/deactivation with soft delete functionality
- **FR-008** – Position management and player-position assignments
- **FR-009** – Club member invitation and role management
- **FR-010** – Cross-club data isolation and security

### 2.2 Authentication and Authorization

**Role Hierarchy:**

- **Admin**: Full system access, user management, all club operations
- **Editor**: Club-level management, team generation, score editing
- **Member/User**: Basic club participation, score submission, profile editing

**Club-Level Roles:**

- **Club Admin**: Full control within specific club
- **Club Editor**: Team generation and match management within club
- **Club Member**: Basic participation and score submission

Access control implemented via:

- Supabase Row Level Security (RLS) policies
- Club membership verification functions
- Role-based route protection in React

### 2.3 Multi-Club Architecture

- Users can belong to multiple clubs simultaneously
- Each club maintains independent: players, match days, team assignments, scores
- Club context switching via URL parameters (`:clubId`)
- Last visited club persistence via localStorage

## 3. Data Requirements

### 3.1 Core Tables

- **auth.users** (Supabase managed authentication)
- **user_profiles** (extends users with application roles)
- **clubs** (club entities with metadata)
- **club_members** (user-to-club relationships with roles)
- **players** (club-scoped player profiles)
- **positions** (volleyball positions: Setter, Outside Hitter, etc.)
- **player_positions** (many-to-many player-position relationships)
- **match_days** (match day events within clubs)
- **game_players** (team assignments for specific match days)
- **matches** (individual game scores within match days)

### 3.2 Key Relationships

- Users ↔ Clubs (many-to-many via club_members)
- Clubs → Players, Match Days (one-to-many, club-scoped)
- Players ↔ Positions (many-to-many via player_positions)
- Match Days → Game Players, Matches (one-to-many)

## 4. System Interface Requirements

### 4.1 Technology Stack

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **State Management**: React Context (AuthContext, ClubContext)
- **Data Fetching**: @tanstack/react-query + Supabase client
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **Deployment**: GitHub → Cloudflare auto-deploy

### 4.2 API Design

- Direct Supabase client queries (no REST API layer)
- Type-safe database operations via generated TypeScript types
- Real-time subscriptions for live data updates
- File upload via Supabase Storage (club images)

## 5. Use Cases

### 5.1 User Onboarding Flow

- **UC-001**: User signup with email/password verification
- **UC-002**: Player profile creation during onboarding
- **UC-003**: Club selection or creation after profile completion

### 5.2 Club Management

- **UC-004**: Create new club with admin privileges
- **UC-005**: Invite members via email with role assignment
- **UC-006**: Switch between multiple club memberships
- **UC-007**: Manage club settings and member roles

### 5.3 Match Day Operations

- **UC-008**: Create match day within club context
- **UC-009**: Generate balanced teams using algorithm
- **UC-010**: Manually adjust team compositions
- **UC-011**: Record multiple game scores per match day
- **UC-012**: View match history and team performance

### 5.4 Player Management

- **UC-013**: Add temporary players for specific match days
- **UC-014**: Update player positions and skill metadata
- **UC-015**: Deactivate/reactivate players with data preservation
- **UC-016**: View cross-club player profiles (if member of same club)

## 6. Non-Functional Requirements

### 6.1 Security

- Row Level Security enforces club data isolation
- Role-based access control at application and database levels
- Secure file uploads with content type validation
- Protected routes prevent unauthorized access

### 6.2 Performance

- Optimized queries with proper indexing
- Real-time updates via Supabase subscriptions
- Client-side caching with React Query
- Lazy loading of non-critical components

### 6.3 Usability

- Mobile-responsive design for match day use
- Intuitive club switching interface
- Progressive web app capabilities
- Offline-first match score entry

## 7. Requirements Traceability

| Requirement | Implementation                             | Verification           |
| ----------- | ------------------------------------------ | ---------------------- |
| FR-001      | Supabase Auth + user_profiles table        | Login/signup flows     |
| FR-002      | PlayerOnboarding component + players table | Profile creation       |
| FR-003      | ClubContext + club_members table           | Multi-club support     |
| FR-004      | match_days table + CRUD operations         | Match day management   |
| FR-005      | TeamGenerator algorithm + game_players     | Balanced team creation |
| FR-006      | matches table + scoring interface          | Game result tracking   |
| FR-007      | is_active flag + soft delete logic         | Player lifecycle       |

## 8. Technical Constraints

### 8.1 Development Constraints

- Must use Cloudflare platform for hosting
- Supabase free tier limitations (500MB storage, 50MB file uploads)
- GitHub integration required for deployment
- TypeScript strict mode compliance

### 8.2 Operational Constraints

- Club member limit: 50 members per club (scalability)
- Match day frequency: No more than daily match days
- File storage: Club images only (no player images in free tier)
- Real-time: Limited to 100 concurrent connections

## 9. Future Enhancements

- **Statistics Dashboard**: Win/loss ratios, player performance metrics
- **Tournament Management**: Multi-day tournament brackets
- **Mobile App**: Native iOS/Android applications
- **Advanced Analytics**: Skill progression tracking, team chemistry analysis
- **Social Features**: Player messaging, match day comments
