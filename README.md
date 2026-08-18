# Copenhagen Chapter

A private, single-user dashboard for the 24-month Lisbon → Copenhagen relocation
and DTU MSc plan: a Copenhagen network/contacts tracker, a weekly habit
tracker, a job application tracker, a finance tracker compared against the
plan's own illustrative income bands, a weekly meal + shopping list log (plan in Goma or wherever, jot down what
you decided here), and a recurring weekly class/work/sport schedule.

Stack: React + TypeScript + Vite, Tailwind CSS v4, Supabase (Postgres + Auth),
Recharts. No custom backend server — Supabase handles the database and login,
Vercel serves the static frontend. Installs to an iPhone home screen as a
standalone app (Share → Add to Home Screen).

---

## 1. Create the database (Supabase — free tier)

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project.
   Pick any region (Frankfurt or Stockholm will be closest to Denmark).
2. Wait for the project to finish provisioning (~2 minutes).
3. Open **SQL Editor** in the left sidebar → **New query**.
4. Paste the entire contents of `supabase/schema.sql` (in this project) and
   click **Run**. This creates all twelve tables and locks each one down with
   Row Level Security, so only your own logged-in account can ever read or
   write your rows.
5. Go to **Project Settings → API**. You'll need two values from this page in
   step 2 below:
   - **Project URL**
   - **anon public** key (not the `service_role` key — that one must never be
     shipped to a browser)
6. Optional but recommended: under **Authentication → Providers → Email**,
   turn **off** "Confirm email" if you want to skip email verification on
   your own account for convenience. Leave it on if you'd rather have that
   extra layer.

## 2. Run it locally

```bash
npm install
cp .env.example .env
# paste your Project URL and anon key into .env
npm run dev
```

Open the local URL it prints, click "First time here? Create your log",
sign up with your own email/password, and the app will seed itself with the
8 phases, starter habits, known job applications, and the two fixed weekly
schedule anchors (Monday batch cooking, Tuesday's long class day)
automatically on first login.

## 3. Deploy it for real (Vercel — free tier)

**Option A — GitHub + Vercel dashboard (no CLI needed):**

1. Create a new empty repository on [github.com](https://github.com/new).
2. Push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/copenhagen-chapter.git
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add
   New → Project**, and import the repository. Vercel auto-detects Vite.
4. Before clicking Deploy, expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy**. In about a minute you'll have a live URL
   (`your-project.vercel.app`) that works from your phone, with no server to
   maintain.

**Option B — Vercel CLI, if you have Node installed locally:**

```bash
npm install -g vercel
vercel login
vercel        # first deploy, follow the prompts
vercel --prod # promote to your production URL
```

When prompted, or afterward in the Vercel dashboard under **Settings →
Environment Variables**, add the same two values as above (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`), then redeploy.

## 4. Sign in and go

Visit your live URL, create your account (same flow as local), and the app
seeds itself the same way. Bookmark it or add it to your phone's home screen
(Share → Add to Home Screen on iOS, or the browser menu on Android) so it
opens like a native app.

---

## Notes

- **This is single-user by design.** Anyone could technically sign up on your
  live URL unless you disable public sign-ups in Supabase (**Authentication →
  Providers → Email → disable "Allow new users to sign up"** once your own
  account exists). Do that after your first login.
- **Editing the plan itself:** the 8 phases, checklist text, starter habits,
  known job applications, and the two schedule anchors are seeded once from
  `src/lib/seedData.ts`. After the first login they live in the database, so
  edit them there going forward — editing `seedData.ts` only affects
  brand-new accounts.
- **The Meals page is not seeded** — a fresh account starts with an empty
  shopping list and a blank dinner for each day of the current week (the
  seven day rows themselves are created automatically so there's a grid to
  fill in). There's nothing to generate: plan the week in Goma or however you
  normally would, then type what you decided into the table.
- **Cost:** genuinely $0 beyond hosting. Supabase's free tier and Vercel's
  free (Hobby) tier both easily cover a single-user app like this, no card
  required for either, and there's no metered API anywhere in this app.
