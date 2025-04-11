# Software Requirements Specification (SRS)

## 1. Introduction
Defines the software logic and roles for the Volleyball Team Generator app, enabling onboarding, match creation, team generation, and role-based data interaction.

## 2. Functional Requirements

### 2.1 Core Features

- FR-001 – Authentication via Supabase Auth
- FR-002 – Player onboarding flow after signup
- FR-003 – Match day creation with flexible team sizes
- FR-004 – Team generator logic with role balancing
- FR-005 – Match submission with multi-game tracking
- FR-006 – Reactivation/Deactivation of players
- FR-007 – Authorization and field-level permissions
- FR-008 – View and edit personal player profile

### 2.2 Authentication and Authorization

- Admin: Full access
- Editor: Can generate teams, manage players, update scores
- User: Limited to self-created data

Access control defined by Supabase RLS using `user_profiles.role`.

## 3. Data Requirements

- Table: users (Supabase managed)
- Table: user_profiles (extends users with roles)
- Table: players (includes is_active, skill_rating)
- Table: match_days, matches, match_teams
- Table: team_players, positions

## 4. System Interface Requirements

- NextJS frontend
- Supabase backend (direct queries and auth)
- REST API routes match definitions from API.md

## 5. Use Cases

- UC-001 – Player onboarding and profile creation
- UC-002 – Fair team generation based on player roles
- UC-003 – Creating and managing match days
- UC-004 – Score entry and revision control
- UC-005 – Admin/Editor control panel for inactive players
- UC-006 – Role-based route access and field editability

## 6. Requirements Traceability

Mapped directly to PRD user stories (e.g., PRD-US-001 → SRS-FR-001).

## 7. Technical Constraints

- Frontend: NextJS + shadcn/ui + Tailwind
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Hosting: GitHub + Lovable
