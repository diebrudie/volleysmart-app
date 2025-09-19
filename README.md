# My Hobby Side-Project App

## Project info

**URL**: [https://volleysmart.lovable.app/](https://volleysmart.lovable.app/)

## Information
Storage buckets (`player-images` and `club-images`) must be created manually in Supabase. Dynamic creation is disabled due to RLS.


**Check the App using a Test Account**

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
