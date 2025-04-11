# Software Requirements Specification (SRS)

## 1. Introduction
This specification defines the software functionality for the Volleyball Team Generator app. The system is designed to allow weekly volleyball games to be scheduled, generate fair teams, track match scores, and manage player profiles with role-based permissions.

## 2. Functional Requirements

### 2.1 Core Features

- FR-001 – Player Management
  - Description: Create, edit, and delete player profiles
  - Rationale: Keep player information current
  - Dependencies: PRD-US-001, US-006
  - Acceptance Criteria: Admin can add/edit/delete players, users can edit their own

- FR-002 – Position Assignment
  - Description: Allow players to choose multiple roles
  - Rationale: Reflect flexibility in playing positions
  - Dependencies: PRD-US-006
  - Acceptance Criteria: User can select one or more positions in their profile

- FR-003 – Team Generator
  - Description: Select today's players and generate two fair teams
  - Rationale: Minimize bias and manual work
  - Dependencies: PRD-US-003, PRD-US-005
  - Acceptance Criteria: Admin/Editor can assign players and get balanced output

- FR-004 – Match Tracking
  - Description: Track individual match scores (5 games/day)
  - Rationale: Archive performance for review
  - Dependencies: PRD-US-004, US-007
  - Acceptance Criteria: Score can be entered once, edited only by Admin/Editor

- FR-005 – Public Match View
  - Description: View today’s teams without login
  - Rationale: Shareable match link for convenience
  - Dependencies: PRD-US-008
  - Acceptance Criteria: Anyone can access match data for today

### 2.2 Authentication and Authorization

- FR-006 – Supabase Auth with Email/Password
  - Role-based: Admin, Editor, User
  - Rationale: Secure data access and permissions
  - Dependencies: PRD-US-002, PRD-US-009
  - Acceptance Criteria: Only authorized users can perform sensitive actions

## 3. Data Requirements

See `Schema.md` for full table structure. Key tables include:
- users
- players
- positions
- match_days
- match_teams
- matches
- team_players

## 4. System Interface Requirements

- Frontend: NextJS using REST calls or Supabase client SDK
- Backend: Supabase Postgres via Supabase JS SDK or direct API endpoints
- All routes protected by RLS policies defined in Supabase

## 5. Use Cases

- UC-001 – Generate Fair Teams
- UC-002 – Create a New Match Day
- UC-003 – Add/Edit Player Profile
- UC-004 – Submit Match Results
- UC-005 – Login and Role Redirect

## 6. Requirements Traceability

Each SRS item maps back to PRD user stories and referenced features. All requirements ensure complete system functionality and security.

## 7. Technical Constraints

- Frontend: NextJS
- UI: shadcn/ui with TailwindCSS
- DB: Supabase PostgreSQL
