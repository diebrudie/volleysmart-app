# VolleySmart

VolleySmart is a modern volleyball team-management app designed to make organizing games effortless.
It builds balanced teams in seconds, tracks scores, and keeps a full match history — so you can spend less time organizing and more time playing.

Live App: https://volleysmart.app/

---

## Why I Built This

Every week I play with a mixed group of friends, all with different skills, positions, and playing styles.
Creating fair teams was always a challenge — and remembering past matches or scores was nearly impossible.

VolleySmart solves this by bringing everything into one place: clubs, events, teams, and scores.

The goal is simple: **make game organization stress-free**.

---

## Features

- **Clubs** — Create a club, invite teammates via a unique club code, approve or reject join requests, manage members
- **Events** — Plan practices, friendly matches, or league games with date, time, location, and optional RSVP deadlines
- **RSVP** — Players respond Going / Not Going; live attendee count and list visible to all members
- **Smart Team Generation** — Automatic balanced teams based on skill ratings and preferred positions
- **Live Score Tracking** — Track set-by-set scores during a game; any team player can add, edit, or add new sets
- **Guest Players** — Add temporary players who don't need an account
- **Game History** — Browse past games with full score breakdowns in the archive
- **Notifications** — Real-time bell notifications for new events, RSVPs, join requests, game starts, and more
- **Event Sharing** — Share events with a dynamic message that adapts based on game state
- **Player Profiles** — Skill assessment onboarding, position preferences, and stats
- **Club Management** — Admin tools for member approval, removal, and club settings
- **Dark / Light Mode** — Theme toggle saved per user
- **Mobile-First PWA** — Works on any device with a browser, no app store download needed

---

## Try VolleySmart (No Setup Needed)

1. Sign up using your email
2. Complete the onboarding to receive your skill score
3. You'll have access to the app right after onboarding
4. Join the **Test Discoverable Club** from the Clubs page to explore all features
5. Or create your **own club** and invite friends to join

Once inside a club, feel free to create events, generate teams, track matches, and navigate through the app.

---

## About This Repository

This repository contains the full source code for VolleySmart.
**It is not intended for plug-and-play local use.**

Running this project locally requires:

- A Supabase project
- Database schema & migrations
- RLS policies
- Storage buckets
- Environment variables for web and mobile
- Supabase Edge Functions
- Correct project configuration across the monorepo

Because of this, **local development is only recommended for contributors** or developers familiar with Supabase and monorepo setups.

If you simply want to use or evaluate the product, please use the hosted app instead:

**https://volleysmart.app**

---

## Tech Stack

### Web App (PWA)

- React 18
- TypeScript
- Vite 7 + SWC
- React Router v6
- shadcn/ui + Radix UI primitives
- Tailwind CSS
- TanStack React Query
- Supabase (Auth, DB, Realtime, Storage, RLS)
- Cloudflare Pages (CI/CD & hosting)

### Mobile App (Early Development)

- Expo (React Native)
- Expo Router
- Shared logic and types with the web app via the monorepo

### Monorepo Structure

```
apps/
  web/       → Production PWA (React + Vite)
  mobile/    → Expo app (React Native)
packages/
  core/      → Shared logic, utilities, types
  supabase/  → DB schema, migrations, RLS, functions
```

---

## Contributing

If you are interested in contributing or reviewing the codebase:

- The `/supabase` folder contains the full schema and migrations
- The monorepo uses npm workspaces
- Web build command: `npm run build -w @volleysmart/web`
- The project expects Supabase environment variables and matching backend configuration

If you'd like access for contribution or internal review, feel free to contact me.

---

## License

This project is developed as a personal side project.
No license is granted for commercial use.
Contact me if you have questions.

---
