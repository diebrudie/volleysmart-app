# VolleySmart

VolleySmart is a modern volleyball team-management app designed to make organizing games effortless.  
It builds balanced teams in seconds, tracks scores, and keeps a full match history — so you can spend less time organizing and more time playing.

Live App: https://volleysmart.app/

---

## Why I Built This

Every week I play with a mixed group of friends, all with different skills, positions, and playing styles.  
Creating fair teams was always a challenge — and remembering past matches or scores was nearly impossible.

VolleySmart solves this:

- Automatically generates fair, balanced teams
- Lets you adjust lineups manually
- Tracks full match days and set scores
- Centralizes club management
- Provides a clean mobile-first PWA experience

The goal is simple: **make game organization stress-free**.

---

## Try VolleySmart (No Setup Needed)

Because the app is designed around **clubs** and **membership**, the best way to explore it is through the onboarding and test flow:

1. Sign up using your email
2. Complete the onboarding to receive your skill score
3. On the `/start` page, choose **Join a Club**
4. Enter the demo Club ID: `AOJKT`
5. Your request will be sent to the club admin.  
   You will see the club only **after the admin approves your membership**.

If you prefer immediate access, you can also:

- Create your **own club**
- Invite friends or teammates to join
- Explore all features without waiting for approval

Once inside a club, feel free to generate teams, track matches, and navigate through the app.

Enjoy!

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

VolleySmart is built using:

### Web App (PWA)

- React 18
- TypeScript
- Vite 7 + SWC
- React Router v6
- shadcn/ui
- Radix UI primitives
- Tailwind CSS
- TanStack React Query
- Supabase (Auth, DB, Storage, RLS)
- React Context (Auth, Club, Theme)
- Cloudflare Pages (CI/CD & hosting)

### Mobile App (Early Development)

- Expo (React Native)
- Expo Router
- Shared logic and types with the web app via the monorepo

### Monorepo Structure

```bash
apps/
web/ → Production PWA (React + Vite)
mobile/ → Expo app (React Native)
packages/
core/ → Shared logic, utilities, types
supabase/ → DB schema, migrations, RLS, functions
```

---

## Contributing

If you are interested in contributing or reviewing the codebase:

- The `/supabase` folder contains the full schema and migrations
- The monorepo uses npm workspaces
- Web build command: `npm run build -w @volleysmart/web`
- The project expects Supabase environments variables and matching backend configuration

If you’d like access for contribution or internal review, feel free to contact me.

---

## License

This project is developed as a personal side project.  
No license is granted for commercial use.  
Contact me if you have questions.

---
