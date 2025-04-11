# Product Requirements Document

## 1. Title and Overview

### 1.1 Document Title & Version
Volleyball Team Generator – PRD v1.1

### 1.2 Product Summary
This product provides an intuitive web-based system for organizing weekly volleyball matches. Users can sign up, create and manage their player profiles, view match history, and track individual and team stats. Admins and editors can generate fair teams based on player roles and update match data. The app supports temporary players and has role-based permissions for secure, streamlined access.

## 2. User Personas

### 2.1 Key User Types
- Admin
- Editor
- Registered User (Player)

### 2.2 Basic Persona Details

**Admin**
- Oversees match creation, data integrity, and user roles
- Needs full control of player data, match days, and score updates

**Editor**
- Supports Admins by managing match day setup, team generation, and score tracking
- Does not control user accounts

**User (Player)**
- Can sign up and create their own profile
- Can edit personal info and rate their own skill during onboarding
- Can create match days and submit scores
- Cannot access score editing after submission

### 2.3 Role-based Access

| Role   | Permissions |
|--------|-------------|
| Admin  | Full access to all operations, including player deletion/reactivation |
| Editor | Manage match setup, team generation, scores, and onboarding |
| User   | Edit own profile, submit scores, create match days |

## 3. User Stories

- US-001: As a User, I want to sign up using email/password
- US-002: As a User, I want to complete onboarding after signup
- US-003: As a User, I want to create my own player profile with positions and skill rating
- US-004: As an Admin, I want to see and manage all players, including deactivated ones
- US-005: As an Editor, I want to create match days and assign players to teams
- US-006: As a User, I want to submit match results
- US-007: As a MatchCreator, I want to update or delete my own match
- US-008: As an Admin, I want to deactivate/reactivate players without deleting their data
- US-009: As a User, I want to view my own and other public player profiles
- US-010: As an Admin or Editor, I want to generate balanced teams based on player positions
- US-011: As a User, I want to view today’s match day without logging in
