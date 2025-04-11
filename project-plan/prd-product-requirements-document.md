# Product Requirements Document

## 1. Title and Overview

### 1.1 Document Title & Version

Volleyball Team Generator – PRD v1.0

### 1.2 Product Summary

This product provides an easy-to-use interface to manage weekly volleyball matches, allowing an admin or editor to generate fair teams based on player positions and hidden skill levels. Users can view match history, track individual games, check other players profiles and manage their profiles.

## 2. User Personas

### 2.1 Key User Types

- Admin
- Editor
- User (Registered Player)

### 2.2 Basic Persona Details

**Admin**

- Oversees team generation and data management
- Wants complete control and ability to correct mistakes
- Needs secure access and confidence in data reliability

**Editor**

- Helps set up matches and input scores
- Needs a fast, intuitive interface to set up weekly games

**User**

- A player who joins weekly matches
- Wants to view match results and their own profile
- Should not be overwhelmed with features

### 2.3 Role-based Access

| Role   | Permissions                                     |
| ------ | ----------------------------------------------- |
| Admin  | Full access: manage players, match days, scores |
| Editor | Can generate teams, enter scores                |
| User   | View match history, edit own profile            |

## 3. User Stories

- US-001 – As an Admin, I want to add/edit/remove players so that the match day list is always up to date.
- US-002 – As a User, I want to log in securely using my email and password.
- US-003 – As an Editor, I want to select today's players and generate teams fairly based on roles.
- US-004 – As a User, I want to view the results of previous matches and see who played in which team.
- US-005 – As an Admin/Editor, I want to assign fixed roles to specific players on match days.
- US-006 – As a User, I want to edit my own profile and select which positions I can play.
- US-007 – As an Admin, I want to set and later update match scores.
- US-008 – As a User, I want to view today's teams and match scores.
- US-009 – As an Admin, I want to restrict access based on roles.
