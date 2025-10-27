# My Hobby Side-Project App

## Project info

I created VolleySmart to make volleyball gatherings easier. The app builds fair, balanced teams in seconds, tracks scores, and keeps match history so you can focus on playing.

### A Bit of Background

Every week I play volleyball with a mixed group of friends. We all have different skill levels, positions, and styles of play — which makes creating fair teams a challenge. On top of that, we never really tracked scores or remembered how past matches went.

That’s why I built VolleySmart. It takes the stress out of organizing games. Based on who’s playing that day, the app automatically generates balanced teams by skill level, gender, and preferred positions. If needed, you can still tweak the lineups manually — but most of the work is already done for you.

With VolleySmart, you can also record set scores, keep a full history of matches, and manage your club in one place. The goal is simple: spend less time organizing and more time playing the game we all love.

Go and check it out here:
**URL**: [https://volleysmart.app/](https://volleysmart.app/)

## Information

Storage buckets (`player-images` and `club-images`) must be created manually in Supabase. Dynamic creation is disabled due to RLS.

## Check the App using a Test Account\*\*

Since the app works best when the user belongs to a Club, you can simply sollow these steps:

1. Signup using your email address.
2. Complete the onboarding to get a Score.
3. When landing on the `/start` page, select `Join a Club`
4. Enter the following ClubId = `AOJKT`
5. Navigate and play around with the app.
6. Enjoy!

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
