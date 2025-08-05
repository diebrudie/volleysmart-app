<details>
<summary>Click to expand: New supabase-schema.md</summary>
markdown# Supabase Database Schema

## Overview

VolleyMatch is a **club-centric** volleyball management application where users can belong to multiple clubs, and each club manages its own players, match days, and games independently.

## Core Architecture

Users ──┐
├─► Club Members ──► Clubs ──┬─► Players
│ ├─► Match Days ──┬─► Game Players (Team Assignments)
└─► User Profiles │ └─► Matches (Scores)
└─► Club Settings

## Database Tables

### 1. Authentication & User Management

#### **user_profiles**

- **Purpose**: Extends Supabase Auth users with application-specific metadata
- **Fields**:
  - `id` UUID PRIMARY KEY (references auth.users)
  - `created_at` TIMESTAMP
  - `email` STRING (nullable)
  - `role` STRING ('admin', 'editor', 'user')

#### **club_members**

- **Purpose**: Links users to clubs with role-based permissions
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `club_id` UUID → clubs(id)
  - `user_id` UUID → auth.users(id)
  - `role` STRING ('admin', 'editor', 'member')
  - `is_active` BOOLEAN
  - `joined_at` TIMESTAMP

### 2. Club Management

#### **clubs**

- **Purpose**: Core club entities that contain all volleyball activities
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `name` STRING (required)
  - `description` STRING (optional)
  - `image_url` STRING (optional)
  - `slug` STRING (optional, for friendly URLs)
  - `created_by` UUID → auth.users(id)
  - `created_at` TIMESTAMP

### 3. Player Management

#### **players**

- **Purpose**: Player profiles within specific clubs
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `user_id` UUID → auth.users(id) (nullable for temporary players)
  - `club_id` UUID → clubs(id) (nullable in schema, but logically required)
  - `first_name` STRING (required)
  - `last_name` STRING (required)
  - `bio` STRING (optional)
  - `birthday` DATE (optional)
  - `gender` STRING (required: male/female/other/diverse)
  - `image_url` STRING (optional)
  - `skill_rating` INTEGER (1-10, hidden from players)
  - `height_cm` INTEGER (optional)
  - `is_active` BOOLEAN (soft delete)
  - `is_temporary` BOOLEAN (for guest players)
  - `member_association` BOOLEAN
  - `profile_completed` BOOLEAN
  - `competition_level`, `general_skill_level`, `training_status`, `game_performance` STRING (optional metadata)

#### **positions**

- **Purpose**: Standard volleyball positions (Setter, Outside Hitter, etc.)
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `name` STRING (required, unique)

#### **player_positions**

- **Purpose**: Many-to-many relationship between players and positions
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `player_id` UUID → players(id)
  - `position_id` UUID → positions(id)
  - `is_primary` BOOLEAN (indicates primary position)

### 4. Match Management

#### **match_days**

- **Purpose**: Events representing a day of volleyball matches
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `club_id` UUID → clubs(id)
  - `date` DATE (required)
  - `created_by` UUID → auth.users(id)
  - `created_at` TIMESTAMP
  - `notes` STRING (optional)
  - `team_generated` BOOLEAN (indicates if teams were auto-generated)

#### **game_players**

- **Purpose**: Team assignments for players on specific match days
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `match_day_id` UUID → match_days(id)
  - `player_id` UUID → players(id)
  - `team_name` STRING (e.g., "Team A", "Team B")
  - `position_played` STRING (optional, position for this game)
  - `original_team_name` STRING (for tracking changes)
  - `manually_adjusted` BOOLEAN
  - `adjusted_by` UUID → auth.users(id)
  - `adjusted_at` TIMESTAMP
  - `adjustment_reason` STRING
  - `created_at`, `updated_at` TIMESTAMP

#### **matches**

- **Purpose**: Individual game scores within a match day (typically 5 games per day)
- **Fields**:
  - `id` UUID PRIMARY KEY
  - `match_day_id` UUID → match_days(id)
  - `game_number` INTEGER (1-5)
  - `team_a_score` INTEGER
  - `team_b_score` INTEGER
  - `added_by_user_id` UUID → auth.users(id)

## Key Relationships

1. **Users → Clubs**: Many-to-many via `club_members`
2. **Clubs → Players**: One-to-many (club scope)
3. **Players → Positions**: Many-to-many via `player_positions`
4. **Clubs → Match Days**: One-to-many
5. **Match Days → Game Players**: One-to-many (team assignments)
6. **Match Days → Matches**: One-to-many (individual game scores)

## Row Level Security (RLS)

- **Club Scope**: All data is scoped to clubs via club membership
- **Visibility Rule**: Users can only see data from clubs they're members of
- **Admin Functions**: Several security definer functions handle admin operations
- **Key Functions**: `is_club_admin`, `is_club_member`, `user_can_view_club_members`

## Default Positions

Standard volleyball positions are seeded:

- Setter
- Outside Hitter
- Opposite Hitter
- Middle Blocker
- Libero

## Schema Notes

- **Multi-club Support**: Core architectural decision
- **Temporary Players**: Supported via `is_temporary` flag and nullable `user_id`
- **Skill Ratings**: Hidden from players after onboarding
- **Team Generation**: Uses `game_players` table for assignments
- **Match Scoring**: Supports multiple games per match day
- **Audit Trail**: Tracks team adjustments and match creation
</details>
