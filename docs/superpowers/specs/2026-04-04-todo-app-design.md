# Todo App — Design Spec
**Date:** 2026-04-04
**Stack:** React + Vite, Supabase, Vercel

---

## Overview

A simple web-based todo app accessible from any browser (desktop or mobile) via a public URL. Todos sync across devices in real time via Supabase. Users authenticate with email and password. The app is hosted on Vercel and requires no custom backend.

---

## Architecture

```
Browser / Mobile Browser
        │
        ▼
   React + Vite SPA
   (hosted on Vercel)
        │
        ▼
  Supabase JS SDK
        │
   ┌────┴────┐
   │         │
Supabase   Supabase
  Auth       DB
(email/pw) (PostgreSQL)
```

- **React + Vite** — frontend SPA deployed to Vercel via GitHub push
- **Supabase Auth** — email/password login; sessions persisted in `localStorage` automatically
- **Supabase DB** — PostgreSQL with Row Level Security (RLS) ensuring users only access their own data
- **Vercel** — serves the static frontend globally via a public URL

No custom backend is required. The Supabase JS SDK communicates with Supabase directly from the browser.

---

## Screens & Components

### Auth Screen
Shown when no session exists.

- Email and password input fields
- Toggle between **Sign In** and **Sign Up** mode (no separate pages)
- Inline error messages from Supabase Auth
- On success, transition to the Todo Screen

### Todo Screen
Shown when a valid session exists.

- **Add todo** — text input at the top; submits on Enter or button click
- **Todo list** — ordered by `created_at` ascending; each item contains:
  - Checkbox to toggle `completed` (strikes through text when checked)
  - Todo text
  - Delete button to remove the item
- **Sign out** button — clears session and returns to Auth Screen
- No inline editing of existing todo text

---

## Data Model

One table in Supabase:

```sql
todos (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        text          NOT NULL,
  completed   boolean       NOT NULL DEFAULT false,
  created_at  timestamptz   NOT NULL DEFAULT now()
)
```

**Row Level Security policy:**
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` are all restricted to rows where `user_id = auth.uid()`

---

## Data Flow

### Auth
1. User submits email + password
2. Supabase Auth validates credentials and returns a session
3. SDK stores session in `localStorage` automatically
4. On page reload, SDK restores session — user stays logged in
5. Sign out clears the session from `localStorage`

### Todos
1. On login, fetch all todos for the current user ordered by `created_at`
2. Add todo → `INSERT` row → append to local list
3. Toggle complete → `UPDATE completed` → update local list
4. Delete → `DELETE` row → remove from local list
5. No real-time subscription needed; list reflects local state after each operation

---

## Deployment

### Environment Variables
Two variables required in both `.env.local` (local dev) and Vercel dashboard (production):

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Local Development
```bash
npm run dev   # App available at http://localhost:5173
```

### Production
1. Push repo to GitHub
2. Link repo to Vercel (one-time setup in Vercel dashboard)
3. Add the two environment variables in Vercel project settings
4. Every push to `main` triggers an auto-deploy; public URL updates within ~30 seconds

---

## Setup Checklist (Pre-Implementation)

- [ ] Install Node.js via nvm
- [ ] Create a Supabase project at supabase.com
- [ ] Create the `todos` table with the schema above
- [ ] Enable RLS and add the user-scoped policies
- [ ] Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase project settings
- [ ] Create a Vercel account and link to GitHub

---

## Out of Scope

- Due dates, priorities, categories, or labels
- Editing existing todo text
- Real-time multi-device sync (refresh reflects latest state)
- Social login (Google, GitHub, etc.)
- Mobile native app (PWA or React Native)
