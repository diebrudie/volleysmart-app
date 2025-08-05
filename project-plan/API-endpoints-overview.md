<details>
<summary>Click to expand: New API-endpoints-overview.md</summary>
# API Endpoints Overview

## Authentication Endpoints

| Endpoint        | Method | Table Group   | Path                      |
| --------------- | ------ | ------------- | ------------------------- |
| User Signup     | POST   | auth          | /api/auth/signup          |
| User Login      | POST   | auth          | /api/auth/login           |
| User Profile    | GET    | user_profiles | /api/auth/me              |
| Password Reset  | POST   | auth          | /api/auth/password/reset  |
| Password Update | PATCH  | auth          | /api/auth/password/update |

## Club Management

| Endpoint         | Method | Table Group         | Path                 |
| ---------------- | ------ | ------------------- | -------------------- |
| Create Club      | POST   | clubs               | /api/clubs           |
| Get User's Clubs | GET    | clubs, club_members | /api/clubs           |
| Get Club Details | GET    | clubs               | /api/clubs/:id       |
| Update Club      | PATCH  | clubs               | /api/clubs/:id       |
| Join Club        | POST   | club_members        | /api/clubs/:id/join  |
| Leave Club       | DELETE | club_members        | /api/clubs/:id/leave |

## Member Management

| Endpoint           | Method | Table Group  | Path                           |
| ------------------ | ------ | ------------ | ------------------------------ |
| Get Club Members   | GET    | club_members | /api/clubs/:clubId/members     |
| Invite Member      | POST   | club_members | /api/clubs/:clubId/invite      |
| Update Member Role | PATCH  | club_members | /api/clubs/:clubId/members/:id |
| Remove Member      | DELETE | club_members | /api/clubs/:clubId/members/:id |

## Player Management

| Endpoint              | Method | Table Group | Path                        |
| --------------------- | ------ | ----------- | --------------------------- |
| Create Player Profile | POST   | players     | /api/players/onboarding     |
| Get Club Players      | GET    | players     | /api/clubs/:clubId/players  |
| Get Player Details    | GET    | players     | /api/players/:id            |
| Update Player         | PATCH  | players     | /api/players/:id            |
| Deactivate Player     | PATCH  | players     | /api/players/:id/deactivate |
| Reactivate Player     | PATCH  | players     | /api/players/:id/reactivate |

## Position Management

| Endpoint                | Method | Table Group      | Path                       |
| ----------------------- | ------ | ---------------- | -------------------------- |
| Get All Positions       | GET    | positions        | /api/positions             |
| Update Player Positions | PATCH  | player_positions | /api/players/:id/positions |

## Match Day Management

| Endpoint              | Method | Table Group | Path                          |
| --------------------- | ------ | ----------- | ----------------------------- |
| Create Match Day      | POST   | match_days  | /api/match-days               |
| Get Club Match Days   | GET    | match_days  | /api/clubs/:clubId/match-days |
| Get Match Day Details | GET    | match_days  | /api/match-days/:id           |
| Update Match Day      | PATCH  | match_days  | /api/match-days/:id           |
| Delete Match Day      | DELETE | match_days  | /api/match-days/:id           |

## Team Generation

| Endpoint                | Method | Table Group  | Path                               |
| ----------------------- | ------ | ------------ | ---------------------------------- |
| Generate Teams          | POST   | game_players | /api/match-days/:id/generate-teams |
| Update Team Assignments | PATCH  | game_players | /api/match-days/:id/teams          |
| Get Team Assignments    | GET    | game_players | /api/match-days/:id/teams          |

## Match/Game Scoring

| Endpoint             | Method | Table Group | Path                        |
| -------------------- | ------ | ----------- | --------------------------- |
| Create Match Score   | POST   | matches     | /api/matches                |
| Get Match Day Scores | GET    | matches     | /api/match-days/:id/matches |
| Update Match Score   | PATCH  | matches     | /api/matches/:id            |
| Delete Match Score   | DELETE | matches     | /api/matches/:id            |

## Admin Endpoints

| Endpoint         | Method | Table Group   | Path                      |
| ---------------- | ------ | ------------- | ------------------------- |
| Get All Users    | GET    | user_profiles | /api/admin/users          |
| Update User Role | PATCH  | user_profiles | /api/admin/users/:id/role |

## Notes

- All endpoints require authentication except public match views
- Club-specific endpoints require club membership
- Admin/Editor role restrictions apply where noted
- `:clubId` parameter ensures data scoping to specific clubs
- RLS policies enforce data visibility automatically
</details>
