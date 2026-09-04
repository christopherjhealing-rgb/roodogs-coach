# Bloom Pilates

Instructor companion for Bloom Studios: a movement library (mat, reformer,
barre), a timed lesson-plan builder, a fullscreen teach mode and a calendar
for logging which classes were taught. Built for a phone in the studio, works
on a laptop too. Each instructor signs in and sees only their own plans,
calendar and custom movements.

## Run it locally

```bash
cd pilates
npm install
npm run dev
```

With no Supabase keys the app runs in **this device only** mode: no sign-in,
everything stored in the browser. That is enough to try it out.

## Set up accounts (Supabase)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql` and run it.
   This creates the tables and the row-level security policies that keep each
   instructor's data private.
3. In **Authentication → Providers → Email**, leave email + password on. Turn
   **Confirm email** off if you want instructors to be able to sign in
   immediately after creating an account (otherwise they get a confirmation
   link first).
4. In **Authentication → URL Configuration**, set the Site URL to your
   deployed address (e.g. `https://bloom-pilates.vercel.app`) and add
   `https://bloom-pilates.vercel.app/auth/callback` (and
   `http://localhost:3000/auth/callback` for local use) to Redirect URLs.
5. Copy the **Project URL** and **anon public key** from Project Settings →
   API into `.env.local` (see `.env.example`) or into Vercel's environment
   variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

## Deploy on Vercel

Import the GitHub repo and set **Root Directory** to `pilates` (the repo also
contains the Roodogs rugby app at the root). Add the two environment
variables above. Framework preset: Next.js. That's it.

## Structure

- `lib/types.ts` – data model (Movement, LessonPlan, ClassLog)
- `lib/seedMovements.ts` – the shared, read-only movement library that ships
  with the app. Instructors can copy any movement into their own library to
  edit it, or add brand-new ones.
- `lib/repo.ts` – storage interface with a Supabase implementation and a
  localStorage one; pages never touch either directly.
- `lib/plan.ts`, `lib/dates.ts`, `lib/search.ts` – pure helpers, unit-tested
  (`npm test`).
- `components/DataProvider.tsx` – picks the repo, tracks the signed-in user.
- `proxy.ts` – refreshes the session and redirects signed-out visitors.
- `app/library`, `app/plans`, `app/calendar`, `app/account` – the four tabs.
- `supabase/schema.sql` – database schema + policies.

## Commands

- `npm run dev` – local dev
- `npm run build` – production build (must pass before commit)
- `npm test` – unit tests (must pass before commit)
