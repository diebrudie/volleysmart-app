You are a senior database architect tasked with designing a comprehensive and accurate database schema based on the provided Software Requirements Specification (SRS). Your schema should precisely represent all entities, attributes, and relationships outlined in the SRS and ensure direct traceability.

<srs_document>
Problem:
Every week I play volleyball with a team. We are between 20–25 people in total. Each week only 12 of us go to play so we can have a 6vs6 match. Each person plays one or more positions: Setter, Outside Hitter, Opposite Hitter, Middle Blocker, Libero. Some players always play the same position; others vary.

Creating fair, balanced teams every week is time-consuming and sometimes unfair due to skill differences and position mismatches.

Solution:
Develop a web application with the following features:

- Player Management:
  - Add/remove players
  - Profile includes name, image, bio, positions, skill rating (1–10, hidden)
- Authentication:
  - Login with email and password
  - Roles: Admin, Editor, User
- Match Management:
  - Select who’s playing
  - Generate 2 fair, random teams based on position and role balance
  - Assign fixed positions to specific players when needed
  - Record matches (5 per day), track scores and wins
  - Anyone can submit match scores, only Admin/Editor can edit
- Team History:
  - Homepage shows all match days with win/loss summary
  - Each match day view shows team rosters, match scores, positions played
- Profiles:
  - View other player profiles
  - Only users can edit their own profile
- Public Access:
  - Match day overview accessible via public link
- Optional Stats:
  - Track win ratios, attendance, most active player etc. in future

Tech Stack:
- Frontend: Lovable (low-code, GitHub connected)
- Backend: Supabase (PostgreSQL, Auth, RLS)
</srs_document>

## Database Schema

### 1. Data Design & Schema

#### 1.1 Entities

**users**
- id UUID PRIMARY KEY
- email VARCHAR(255), UNIQUE, NOT NULL
- role VARCHAR(50), CHECK (role IN ('admin', 'editor', 'user'))

**players**
- id UUID PRIMARY KEY
- user_id UUID, FK to users(id)
- first_name VARCHAR(100)
- last_name VARCHAR(100)
- image_url TEXT
- bio TEXT
- skill_rating INTEGER CHECK (skill_rating BETWEEN 1 AND 10)
- is_active BOOL
- member_association BOOL

**positions**
- id UUID PRIMARY KEY
- name VARCHAR(50) UNIQUE NOT NULL

**player_positions**
- id UUID PRIMARY KEY
- player_id UUID, FK to players(id)
- position_id UUID, FK to positions(id)

**match_days**
- id UUID PRIMARY KEY
- date DATE NOT NULL
- created_by UUID, FK to users(id)
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- team_generated BOOLEAN DEFAULT FALSE
- notes TEXT

**match_teams**
- id UUID PRIMARY KEY
- match_day_id UUID, FK to match_days(id)
- team_name VARCHAR(100)

**team_players**
- id UUID PRIMARY KEY
- match_team_id UUID, FK to match_teams(id)
- player_id UUID, FK to players(id)
- position_id UUID, FK to positions(id)

**matches**
- id UUID PRIMARY KEY
- match_day_id UUID, FK to match_days(id)
- game_number INTEGER CHECK (game_number BETWEEN 1 AND 5)
- team_a_score INTEGER
- team_b_score INTEGER
- added_by UUID, FK to users(id)

#### 1.2 SQL Schema (Migration Script)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'user'))
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  image_url TEXT,
  bio TEXT,
  skill_rating INTEGER CHECK (skill_rating BETWEEN 1 AND 10)
);

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE player_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  position_id UUID REFERENCES positions(id)
);

CREATE TABLE match_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  team_generated BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE TABLE match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id UUID REFERENCES match_days(id),
  team_name VARCHAR(100)
);

CREATE TABLE team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_team_id UUID REFERENCES match_teams(id),
  player_id UUID REFERENCES players(id),
  position_id UUID REFERENCES positions(id)
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id UUID REFERENCES match_days(id),
  game_number INTEGER CHECK (game_number BETWEEN 1 AND 5),
  team_a_score INTEGER,
  team_b_score INTEGER,
  added_by_user_id UUID REFERENCES users(id)
);
```

### 2. Minimal Test Data
```sql
INSERT INTO users (email, role) VALUES
('admin@volleyapp.com', 'admin'),
('editor@volleyapp.com', 'editor'),
('user1@volleyapp.com', 'user');

INSERT INTO positions (name) VALUES
('Setter'), ('Outside Hitter'), ('Opposite Hitter'), ('Middle Blocker'), ('Libero');
```

### 3. Schema Review
- All required entities and attributes from the SRS are covered.
- Each player can play multiple positions using `player_positions` (SRS: Flexible player roles).
- `match_days`, `match_teams`, `team_players`, and `matches` support fair team generation and tracking of 5-match days.
- Role-Based Access can be enforced with Supabase RLS.
- Schema extensible for future player stats, public pages, and RSVPs.

### 4. Formatting Guidelines
- Markdown headers used for readability.
- SQL blocks are formatted and grouped logically.
- Comments removed for deployment-readiness.
