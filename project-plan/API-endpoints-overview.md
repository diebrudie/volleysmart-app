# API Endpoints Overview

| Name                    | Table Group  | REQUEST | Path                        |
| :---------------------- | :----------- | :------ | :-------------------------- |
| User Signup             | users        | POST    | /api/auth/signup            |
| User Login              | users        | POST    | /api/auth/login             |
| Me User Retrieval       | users        | GET     | /api/auth/me                |
| Password Reset          | users        | POST    | /api/auth/password/reset    |
| Password Update         | users        | PATCH   | /api/auth/password/update   |
| Get Player by ID        | players      | GET     | /api/players/:id            |
| Player Onboarding       | players      | POST    | /api/players/onboarding     |
| Delete Player           | players      | DELETE  | /api/players/:id            |
| Update Player           | players      | PATCH   | /api/players/:id            |
| Retrieve All Player     | players      | GET     | /api/players                |
| Reactivate Player       | players      | PATCH   | /api/players/:id/reactivate |
| Deactivate Player       | players      | PATCH   | /api/players/:id/deactivate |
| Generate Teams          | team_players | POST    | /api/teams/generate         |
| Update Teams            | team_players | PATCH   | /api/teams/:match_day_id    |
| Retrieve All Match Days | match_day    | PATCH   | /api/players/:id/deactivate |
| Create Match Day        | match_day    | POST    | /api/match-days             |
| Update Match Day        | match_day    | PATCH   | /api/match-days/:id         |
| Create Match            | matches      | POST    | /api/matches                |
| Update Match            | matches      | PATCH   | /api/matches/:id            |
| Delete Match            | matches      | DELETE  | /api/matches/:id            |
| Retrieve All Matches    | matches      | GET     | /api/matches                |
