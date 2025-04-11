# API Design

## 1. API Endpoints

### Auth & User Management

- ID: API-01
  Title: User Signup
  Method: POST
  Path: /api/auth/signup

  RequiredRoles:

  - All
    RequestBody:
  - email: string, required
  - password: string, required
    Redirect to:
  - /players/onboarding view  
    Responses:
  - 201: User created
  - 400: Validation error

- ID: API-02
  Title: User Login
  Method: POST
  Path: /api/auth/login

  RequiredRoles:

  - All
    RequestBody:
  - email: string, required
  - password: string, required
    Responses:
  - 200: Authenticated
  - 401: Unauthorized

- ID: API-03
  Title: Me User Retrieval
  Method: GET
  Path: /api/auth/me

  RequiredRoles:

  - All
    Responses:
  - 200: User object
  - 401: Unauthorized

- ID: API-04
  Title: Password Reset
  Method: POST
  Path: /api/auth/password/reset

  RequiredRoles:

  - All
    RequestBody:
  - email: string, required
    Responses:
  - 200: Reset email sent
  - 400: Invalid email

- ID: API-05
  Title: Password Update
  Method: PATCH
  Path: /api/auth/password/update

  RequiredRoles:

  - All
    RequestBody:
  - current_password: string, required
  - new_password: string, required
    Responses:
  - 200: Password updated
  - 403: Incorrect current password

### Players

- ID: API-05
  Title: Get Player by ID
  Method: GET
  Path: /api/players/:id

  RequiredRoles:

  - All
    Description: Retrieves a specific player's public information if active.
    Parameters:
  - id: UUID, required
    Responses:
  - 200: Player data
  - 404: Not found or inactive

- ID: API-07
  Title: Player Onboarding (Signed-up User)
  Method: POST
  Path: /api/players/onboarding

  RequiredRoles:

  - User
    Description: After signup, user completes onboarding to create their player profile.
    RequestBody:
  - first_name: string (required)
  - last_name: string (required)
  - positions: array of position_ids (required)
  - skill_rating: integer (1–10, required)
    Behavior:
  - Links player to current Supabase user_id
  - Stores skill_rating privately (invisible to user after)
    Responses:
  - 201: Player created and linked to user
  - 400: Validation error

- ID: API-08
  Title: Delete Player
  Method: DELETE
  Path: /api/players/:id

  RequiredRoles:

  - Admin
  - Editor (if user_id is NULL)
  - Player themselves (if user_id matches and verified)
    Parameters:
  - id: UUID, required
    Responses:
  - 204: Player deleted
  - 403: Not authorized

- ID: API-09
  Title: Update Player
  Method: PATCH
  Path: /api/players/:id

  RequiredRoles:

  - Admin/Editor (can update score & positions)
  - Player themselves (can update personal info only)
    RequestBody:
  - fields like: first_name, last_name, bio, image_url, positions, skill_rating
    Field Rules:
  - first_name, last_name, bio, image → editable by self
  - positions → editable by self and admin/editor
  - skill_rating → editable ONLY by admin/editor (never shown to user after onboarding)
    Responses:
  - 200: Updated
  - 403: Not authorized

- ID: API-10
  Title: Retrieve All Players
  Method: GET
  Path: /api/players

  RequiredRoles:

  - All
    Description: Only returns players with is_active = true
    Responses:
  - 200: List of active players

- ID: API-11
  Title: Reactivate Player
  Method: PATCH
  Path: /api/players/:id/reactivate

  RequiredRoles:

  - Admin
  - Editor
    Description: Reactivates a player previously deactivated.
    RequestBody: None
    Responses:
  - 200: Player reactivated
  - 403: Unauthorized

- ID: API-12
  Title: Deactivate Player
  Method: PATCH
  Path: /api/players/:id/deactivate

  RequiredRoles:

  - Admin
  - Editor
    Description: Soft-deactivate a player (set is_active = false)
    RequestBody: None
    Responses:
  - 200: Player deactivated
  - 403: Unauthorized

### Team Management

- ID: API-13
  Title: Generate Teams
  Method: POST
  Path: /api/teams/generate
  RequiredRoles:

  - Admin
  - Editor

  RequestBody:

  - player_ids: array of UUIDs
  - fixed_assignments: object (optional map of player_id to position_id)
    Responses:
  - 200: Generated teams

- ID: API-14
  Title: Update Teams
  Method: PATCH
  Path: /api/teams/:match_day_id
  RequiredRoles:

  - Admin
  - Editor

  Description: Allows manual editing of team members and their roles
  RequestBody:

  - updated_players: array of objects with player_id, team_id, position_id
    Responses:
  - 200: Teams updated

### Match Days

- ID: API-15
  Title: Retrieve All Match Days
  Method: GET
  Path: /api/match-days

  RequiredRoles:

  - All
    Description: Retrieves all match day entries. Public view can be filtered.
    Responses:
  - 200: List of match days

- ID: API-16
  Title: Create Match Day
  Method: POST
  Path: /api/match-days

  RequiredRoles:

  - All
    RequestBody:
  - date: string (ISO)
  - notes: string (optional)
    Responses:
  - 201: Match Day created

- ID: API-17
  Title: Update Match Day
  Method: PATCH
  Path: /api/match-days/:id

  RequiredRoles:

  - Admin
  - Editor
  - MatchDayCreator
    Responses:
  - 200: Match day updated
  - 403: Not authorized

### Matches

- ID: API-18
  Title: Create Match
  Method: POST
  Path: /api/matches

  RequiredRoles:

  - All
    RequestBody:
  - match_day_id: UUID
  - game_number: integer
  - team_a_score: integer
  - team_b_score: integer
    Responses:
  - 201: Match created

- ID: API-19
  Title: Update Match
  Method: PATCH
  Path: /api/matches/:id

  RequiredRoles:

  - Admin
  - Editor
  - MatchCreator
    Responses:
  - 200: Match updated
  - 403: Not authorized

- ID: API-20
  Title: Delete Match
  Method: DELETE
  Path: /api/matches/:id

  RequiredRoles:

  - Admin
  - Editor
  - MatchCreator
    Responses:
  - 204: Match deleted

- ID: API-21
  Title: Retrieve All Matches
  Method: GET
  Path: /api/matches

  RequiredRoles:

  - Admin
    Responses:
  - 200: List of all matches

## 2. Schema Review

All endpoints are mapped to the corresponding tables and cover CRUD functionality, complex access rules, and edge cases like user-owned entities and anonymous players.

## 3. Technical Considerations

- 403 = when user is unauthorized by role or ownership
- All endpoints must follow Supabase RLS policies
- Empty data responses should return 200 OK with []
- MatchCreator: refers to the user who originally created the match record
- MatchDayCreator: refers to the user who created the match day entry
- Ownership is resolved via Supabase user_id comparison in RLS
