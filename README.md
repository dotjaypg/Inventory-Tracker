# InvenTrack

Inventory tracker for papers, printing materials, marketing/production materials,
merch, and production equipment — with PIN-based staff identity and real
persistence via Supabase.

## 1. Install dependencies

```
npm install
```

## 2. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) and create a free account + new project.
2. Open **SQL Editor** → New query → paste the entire contents of `supabase/schema.sql` → **Run**.
   This creates the `staff`, `items`, and `logs` tables, the PIN-verification functions,
   and seeds a default admin account (name: `Admin`, PIN: `0000` — change this PIN once you're in!)
   plus the same demo items shown earlier.
3. In your Supabase project, go to **Settings → API**. Copy the **Project URL** and the **anon public key**.
4. Copy `.env.example` to `.env` and paste those two values in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxx
```

## 3. Run it

```
npm run dev
```

Open the printed `localhost` URL. Sign in as **Admin**, PIN **0000**.

If you skip steps 2–4, the app still runs — it just uses local mock data
that resets on every page refresh, instead of real Supabase data. Useful for
quick UI testing, but borrow/turn-back actions won't persist or be visible
to other devices.

## 4. Deploy

Push this folder to a GitHub repo, then import it on [vercel.com](https://vercel.com).
Add the same two `VITE_SUPABASE_*` environment variables in the Vercel project
settings before deploying.

## How sign-in works

There's no email/password. Each person picks their name and types their own
PIN — this is what attributes every borrow and "Turn Back" action to the
right individual, without the overhead of full accounts. Admins manage staff
and PINs from **Settings → Staff & PINs**, including generating a personal QR
code per person that pre-fills their name on the sign-in screen.

**Heads up on security:** this PIN screen is an in-app identity check, not a
database-level lock. The Supabase tables are reachable by anyone holding your
public anon key (which ships inside the app bundle) — that's a normal,
acceptable tradeoff for a small internal tool like this, but don't store
anything sensitive in it.

## Project structure

```
src/
  context/
    AuthContext.tsx        PIN login, staff list, session (localStorage)
    InventoryContext.tsx   items/logs — reads & writes Supabase
  components/
    CategoryChips.tsx      category filter w/ Materials dropdown
    ImageUpload.tsx         drag-and-drop photo upload
    ItemIcon.tsx            photo or initials badge (no emoji)
  pages/
    Login.tsx, Dashboard.tsx, Inventory.tsx, AddItem.tsx,
    Requests.tsx, HistoryPage.tsx, Employees.tsx, Reports.tsx, Settings.tsx
supabase/
  schema.sql                run this once in Supabase's SQL Editor
```

## Known limitations (good next steps)

- **Photos are stored as base64 text**, not in real file storage. Fine for a
  handful of small images; if photo uploads get heavy, move to Supabase
  Storage and store just the URL.
- **No live multi-device sync** — if two people use the app at the same time,
  each only sees the other's changes after refreshing. Supabase Realtime
  subscriptions would close this gap later.
- **QR codes** are generated via a free public API (`api.qrserver.com`) so no
  extra package is needed — swap to a local QR library if you need this to
  work fully offline.
