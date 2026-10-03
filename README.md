# InvenTrack (Inventory Tracker)

Inventory tracker for the Creative Department: papers, printing materials, marketing and production materials, merch, and production equipment. Staff sign in with their name and a PIN, pull out or borrow items, return equipment, and restock. Admins also see the dashboard, reports, staff management, and settings.

This README is the handover guide. Follow the steps in order and you will have the app running locally, a working database, and a live deployment.

> File paths in this guide are written as `main folder > subfolder > file`.
> Example: `inventory-app > src > lib > supabase.ts`

---

## Table of contents

1. [Tech stack](#1-tech-stack)
2. [Project structure](#2-project-structure)
3. [What you need before starting](#3-what-you-need-before-starting)
4. [Step 1: Get the code](#step-1-get-the-code)
5. [Step 2: Build the database (Supabase)](#step-2-build-the-database-supabase)
6. [Step 3: Connect the app to the database](#step-3-connect-the-app-to-the-database)
7. [Step 4: Run the app locally](#step-4-run-the-app-locally)
8. [Step 5: Deploy (Vercel)](#step-5-deploy-vercel)
9. [Step 6: Move existing data from the old database](#step-6-move-existing-data-from-the-old-database-optional)
10. [Handover checklist](#handover-checklist)
11. [How the app works](#how-the-app-works)
12. [Database reference](#database-reference)
13. [Where to change things](#where-to-change-things)
14. [Known issues and security notes](#known-issues-and-security-notes)
15. [Troubleshooting](#troubleshooting)

---

## 1. Tech stack

| Part | Tool |
|---|---|
| Frontend | React 18 + TypeScript |
| Build tool / dev server | Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Charts | recharts |
| Database + API | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Hosting | Vercel |

There is **no custom backend server**. The browser talks directly to Supabase using the public anon key. All database logic (tables, PIN hashing, permissions) lives in one file: `inventory-app > supabase > schema.sql`.

---

## 2. Project structure

```
inventory-app
├── .env                      Supabase URL + key (NOT committed to Git)
├── index.html                HTML entry, loads src/main.tsx
├── package.json              Dependencies and npm scripts
├── vite.config.ts            Vite config (dev server on port 5173)
├── tailwind.config.js        Tailwind theme colors
├── postcss.config.js
├── tsconfig.json / tsconfig.node.json
├── supabase
│   └── schema.sql            THE database. Run once in Supabase SQL Editor.
└── src
    ├── main.tsx              App entry. Wraps App in Theme, Auth, Inventory providers
    ├── App.tsx               Sidebar, page switching, admin vs staff page access
    ├── types.ts              Data types (Item, Log, Restock, DamageRecord, Staff)
    ├── index.css             Tailwind + light/dark color variables
    ├── lib
    │   ├── supabase.ts       Creates the Supabase client from .env values
    │   └── csv.ts            CSV import/export of inventory
    ├── context
    │   ├── AuthContext.tsx   PIN login, staff list, add/delete staff, reset PIN, roles
    │   ├── InventoryContext.tsx  All reads/writes for items, logs, restocks, damage
    │   └── ThemeContext.tsx  Light/dark mode (saved in browser localStorage)
    ├── data
    │   └── mockData.ts       Demo data used ONLY when .env is missing
    ├── components            Reusable UI pieces (modals, badges, uploads)
    └── pages
        ├── Login.tsx         Pick name + enter PIN
        ├── Dashboard.tsx     Admin overview
        ├── Inventory.tsx     Item list, pull-out / borrow
        ├── AddItem.tsx       Create a new item
        ├── Requests.tsx      Active pull-outs, return equipment
        ├── RestockPage.tsx   Add quantity to an existing item
        ├── HistoryPage.tsx   Past pull-outs and returns
        ├── Employees.tsx     Staff list, promote/demote admin
        ├── Reports.tsx       Usage cost and charts
        └── Settings.tsx      Staff & PINs, CSV import/export, DB size, clear history
```

---

## 3. What you need before starting

Install these on your computer:

1. **Node.js 18 or newer** (20 or 22 LTS recommended). Check with:
   ```
   node -v
   npm -v
   ```
2. **Git**. Check with `git --version`.
3. **A code editor** (VS Code recommended).

Create free accounts (or get access from the previous developer):

4. **GitHub** account (where the code lives)
5. **Supabase** account at https://supabase.com (the database)
6. **Vercel** account at https://vercel.com (the hosting). Sign in with GitHub to make importing easier.

---

## Step 1: Get the code

1. Ask the previous developer to either **transfer** the GitHub repository to you or **add you as a collaborator**.
   Current repo: `https://github.com/itsronsairojordan-hub/Inventory-Tracker`
2. Clone it:
   ```
   git clone https://github.com/itsronsairojordan-hub/Inventory-Tracker.git inventory-app
   cd inventory-app
   ```
3. Install packages:
   ```
   npm install
   ```
   This creates the `inventory-app > node_modules` folder. Never commit that folder.

---

## Step 2: Build the database (Supabase)

> Skip to [Step 6](#step-6-move-existing-data-from-the-old-database-optional) instead if you are **taking over the existing live database** rather than starting a fresh one.

1. Log in to https://supabase.com and click **New project**.
2. Fill in:
   - **Name:** `inventrack` (any name works)
   - **Database password:** generate a strong one and **save it somewhere safe** (password manager). You need it for backups and migrations.
   - **Region:** pick the one closest to the users (for the Philippines, **Southeast Asia (Singapore)**).
3. Wait 1 to 2 minutes for the project to finish setting up.
4. In the left menu, open **SQL Editor** and click **New query**.
5. Open `inventory-app > supabase > schema.sql` in your editor, copy **everything**, paste it into the SQL Editor, and click **Run**.
6. You should see "Success. No rows returned" (or a result row from the admin seed). That single file creates:
   - Tables: `staff`, `items`, `logs`, `restocks`, `damage_records`, `app_settings`
   - View: `staff_public` (names and roles only, never PIN hashes)
   - Functions: `verify_pin`, `create_staff`, `set_pin`, `delete_staff`, `set_staff_role`, `get_db_size_mb`, `clear_history`
   - Row Level Security policies and grants
   - Seed data: one admin account and 16 demo items
7. Check it worked: open **Table Editor** in the left menu. You should see the 6 tables, and `items` should have 16 rows.
8. (Optional) Remove the demo items if you want a clean start. In SQL Editor run:
   ```sql
   delete from items;
   ```

> **WARNING:** `schema.sql` starts by **dropping every table**. Running it again on a database with real data **deletes all of that data**. Only run it on a new, empty project. For changes to a live database, write a small `alter table ...` query instead.

**Default login created by the seed:**
- Name: `Admin`
- PIN: `0000`

Change this PIN right after your first login (Step 4).

---

## Step 3: Connect the app to the database

1. In Supabase, open **Project Settings > API** (newer dashboards: click the **Connect** button at the top, or **Project Settings > API Keys** and **Data API**).
2. Copy two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public key** (newer dashboards may call it the **Publishable key**; either works). **Do NOT use the `service_role` / secret key.** That key bypasses all security and must never go into frontend code.
3. Create a file named `.env` in the project root: `inventory-app > .env`
4. Paste this into it, replacing the values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```
5. Save the file. `.env` is already listed in `inventory-app > .gitignore`, so it will not be pushed to GitHub.

> Tip: create a copy called `inventory-app > .env.example` with the same two lines but **fake values**, and commit that one. It shows the next developer which variables are needed.

**What happens if `.env` is missing?** The app still opens but runs on fake demo data from `inventory-app > src > data > mockData.ts`. Nothing is saved, and the login screen will not work because there is no staff list. Settings will show that mock data is in use. If you see that, your `.env` is missing or wrong.

---

## Step 4: Run the app locally

1. Start the dev server:
   ```
   npm run dev
   ```
2. Open the URL it prints (normally http://localhost:5173).
3. Sign in: choose **Admin**, PIN **0000**.
4. Go to **Settings > Staff & PINs** and:
   - Change the Admin PIN.
   - Add each real staff member with their own PIN (4 to 6 digits).
5. Test a full cycle so you know the database is working:
   - Inventory: pull out a material item
   - Requests: borrow and return an equipment item
   - Restock: add quantity to an item
   - History: confirm all of the above appear
6. Check the production build compiles with no TypeScript errors:
   ```
   npm run build
   ```
   This outputs the site into `inventory-app > dist`. You can test it with `npm run preview`.

> If you change `.env` while `npm run dev` is running, stop it (Ctrl + C) and start it again. Vite only reads `.env` on startup.

---

## Step 5: Deploy (Vercel)

1. Make sure your latest code is pushed to GitHub:
   ```
   git add .
   git commit -m "your message"
   git push
   ```
2. Go to https://vercel.com and click **Add New... > Project**.
3. Choose the **Inventory-Tracker** repository and click **Import**.
4. Vercel should detect **Vite** automatically. Confirm these settings:
   - Framework Preset: `Vite`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Open **Environment Variables** and add both:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon / publishable key |

   Tick all environments (Production, Preview, Development).
6. Click **Deploy**. After about a minute you get a live URL like `https://inventory-tracker-xxxx.vercel.app`.
7. Open the live URL and sign in to confirm it works.

**After the first deploy:**
- Every `git push` to the `main` branch redeploys automatically.
- Pushes to other branches create **Preview** deployments (good for testing before merging).
- If you change an environment variable in Vercel, you **must redeploy** (Vercel > Deployments > latest > **Redeploy**). `VITE_` variables are baked into the files at build time, so the old values stay until you rebuild.
- (Optional) Add a custom domain under **Project Settings > Domains**.

---

## Step 6: Move existing data from the old database (optional)

Use this when the app is already in use and the real data must come with the handover. Pick **one** option.

### Option A (easiest): Transfer the Supabase project

No data copying needed. The URL and keys stay the same.

1. The new developer creates a Supabase account and an **organization**.
2. The old developer opens the existing project, goes to **Project Settings > General > Transfer project**, and selects the new organization. (The old developer must be invited to/owner of both orgs for this to show up; follow the prompts.)
3. The new developer resets the database password in **Project Settings > Database** and saves it.
4. Nothing changes in `.env` or Vercel because the URL and anon key are the same.

### Option B: Copy the data into a new Supabase project

1. Do **Step 2** on the new project (run `schema.sql`). Then remove the seed data so it does not clash:
   ```sql
   delete from items;
   delete from staff;
   ```
2. Install the PostgreSQL client tools (`pg_dump` and `psql`, version 15 or newer) on your computer.
3. In each Supabase project, click **Connect** and copy the **Session pooler** connection string. Replace `[YOUR-PASSWORD]` with that project's database password.
4. Export only the data from the old project:
   ```
   pg_dump "OLD_CONNECTION_STRING" --data-only --schema=public --no-owner --no-privileges -f data.sql
   ```
5. Import it into the new project:
   ```
   psql "NEW_CONNECTION_STRING" -f data.sql
   ```
6. In the new project's **Table Editor**, check row counts on `staff`, `items`, `logs`, `restocks`, `damage_records` match the old project.
7. Staff PINs carry over, because the hashed PINs are copied as-is.
8. Update `inventory-app > .env` and the Vercel environment variables with the **new** URL and key, then redeploy.

> Before any migration, take a backup of the old project first (step 4 above on its own is a backup).

---

## Handover checklist

The old developer should hand over or transfer:

- [ ] GitHub repo (transfer, or add the new developer as admin)
- [ ] Supabase project (Option A transfer) or a data export (Option B)
- [ ] Supabase database password
- [ ] Vercel project (Vercel: **Project Settings > General > Transfer**), or let the new developer re-import from GitHub
- [ ] Custom domain DNS access, if one is used
- [ ] The current Admin PIN (or the new developer resets it from another admin account)

The new developer should confirm:

- [ ] `npm install` and `npm run dev` work
- [ ] `npm run build` passes
- [ ] Login works with a real staff account
- [ ] Live Vercel URL loads and saves data
- [ ] Old developer's accounts removed from Supabase, Vercel, and GitHub once everything works

---

## How the app works

### Sign-in (PIN based)

- No email or password. The login page loads names from the `staff_public` view, the person picks their name and types their PIN.
- The PIN is checked by the database function `verify_pin`, which compares it to a bcrypt hash. Plain PINs are never stored.
- Logging in is **not remembered**. Every page refresh goes back to the login screen (by design).
- Code: `inventory-app > src > context > AuthContext.tsx` and `inventory-app > src > pages > Login.tsx`

### Roles

| Role | Pages |
|---|---|
| `admin` | Everything: Dashboard, Inventory, Requests, Restock, History, Employees, Reports, Settings |
| `staff` | Inventory, Add Item, Requests, Restock, History |

The rule list lives in `inventory-app > src > App.tsx` (`ALL_NAV_ITEMS` and `STAFF_ALLOWED_PAGES`). The database blocks deleting or demoting the **last** admin.

### Items: materials vs equipment

- **Materials** (`returnable = false`): pulled out and consumed. Stock goes down permanently.
- **Equipment** (`returnable = true`): borrowed and returned. Condition is recorded when it goes out (`condition_out`) and comes back (`condition_in`).
- If equipment comes back damaged, a **damage record** is created with a repair cost and a required receipt upload.

### Costs

- Each item can have a `pack_price` (pesos per pack/ream/box) and `pack_size` (units per pack).
- Unit cost = `pack_price / pack_size`. The cost of each pull-out is saved on the log at that moment, so later price changes do not rewrite history.
- Normal equipment borrow-and-return costs nothing. Only damage records count as equipment cost.

### Duplicate protection

Add Item and pull-out submissions send a `client_request_id`. The database has a unique rule on it, so a double click cannot create two records.

### Data flow

All database reads and writes go through `inventory-app > src > context > InventoryContext.tsx`. After every change it calls `refresh()` to reload everything. There is no live sync: if two people use the app at once, they see each other's changes only after a refresh.

---

## Database reference

All defined in `inventory-app > supabase > schema.sql`.

| Table | Purpose |
|---|---|
| `staff` | People who can log in. Holds `pin_hash`. Not readable directly by the app. |
| `items` | Every inventory item, stock levels, location, locker, pricing |
| `logs` | Every pull-out / borrow. `status` is `active` or `returned`. `display_id` looks like `REQ-0001`. |
| `restocks` | Quantity added to existing items |
| `damage_records` | Damaged equipment returns with repair cost and receipt |
| `app_settings` | Key/value store. Currently only `last_cleared_at` for the monthly clean-up reminder |

| Function | Called from | Does |
|---|---|---|
| `verify_pin(staff_id, pin_attempt)` | Login | Returns true if PIN matches |
| `create_staff(name, pin, role)` | Settings > Staff & PINs | Adds a staff member with hashed PIN |
| `set_pin(staff_id, new_pin)` | Settings > Staff & PINs | Resets a PIN |
| `delete_staff(staff_id)` | Settings > Staff & PINs | Deletes staff (blocks last admin) |
| `set_staff_role(staff_id, role)` | Employees | Promote/demote (blocks last admin) |
| `get_db_size_mb()` | Settings | Database size for the storage bar (free tier limit 500 MB) |
| `clear_history(clear_logs, clear_restocks)` | Settings | Deletes old logs/restocks. Never touches items, staff, or damage records |

**Making a database change safely (example: add a column):**

1. Write the change in SQL Editor on a test project first:
   ```sql
   alter table items add column barcode text default '';
   ```
2. Run the same line on the live project.
3. Add the same column to `inventory-app > supabase > schema.sql` so fresh setups match.
4. Update the type in `inventory-app > src > types.ts` and the row mapping (`rowToItem`) in `inventory-app > src > context > InventoryContext.tsx`.

**Backups:** The Supabase free plan has limited backups. Before big changes, run the `pg_dump` command from Step 6 to keep your own copy.

**Free plan pause:** Supabase pauses free projects after about a week with no activity. If the app suddenly cannot load data, open the Supabase dashboard and click **Restore project**.

---

## Where to change things

| I want to... | Edit this file |
|---|---|
| Add or rename a category | `inventory-app > src > types.ts` (`CATEGORIES`) **and** the `check` rule on `items.category` in `inventory-app > supabase > schema.sql` (plus `alter table` on the live DB) |
| Change which pages staff can see | `inventory-app > src > App.tsx` |
| Change the sidebar title "InvenTrack / Creative Dept." | `inventory-app > src > App.tsx` |
| Change the browser tab title | `inventory-app > index.html` |
| Change colors / dark mode | `inventory-app > src > index.css` and `inventory-app > tailwind.config.js` |
| Change PIN length rules (4 to 6 digits) | `inventory-app > src > context > AuthContext.tsx` |
| Change CSV import/export columns | `inventory-app > src > lib > csv.ts` |
| Change the storage limit shown in Settings | `inventory-app > src > pages > Settings.tsx` (`FREE_TIER_LIMIT_MB`) |
| Change error messages shown to users | `inventory-app > src > context > InventoryContext.tsx` (`friendlyError`) |

---

## Known issues and security notes

Read these before taking over. They are honest limits of the current build.

1. **The PIN screen is not real database security.** The anon key ships inside the website, and the database functions (`set_pin`, `create_staff`, `set_staff_role`, `delete_staff`) can be called by anyone holding that key, without knowing any PIN. A technical person could reset the admin PIN or make themselves admin. Items and logs are also fully readable and writable. This is acceptable only for a small internal tool. Do not store sensitive data in it. A proper fix is moving to Supabase Auth, or having those functions require the caller's current admin PIN.
2. **Deleting a staff member who has pull-out history fails.** `logs.staff_id` points to `staff.id` without `on delete set null`, so the database refuses the delete. Fix by running once on the live database:
   ```sql
   alter table logs drop constraint logs_staff_id_fkey;
   alter table logs add constraint logs_staff_id_fkey
     foreign key (staff_id) references staff(id) on delete set null;
   alter table restocks drop constraint restocks_staff_id_fkey;
   alter table restocks add constraint restocks_staff_id_fkey
     foreign key (staff_id) references staff(id) on delete set null;
   ```
   Then update the same lines in `schema.sql`.
3. **Photos and receipts are stored as base64 text** inside the database (`items.image_url`, `damage_records.receipt_url`). Large images fill up the 500 MB free limit fast. Next step: move them to Supabase Storage and save only the URL.
4. **No live sync** between users. Each person sees others' changes only after refreshing. Supabase Realtime could fix this.
5. **Stock updates are not atomic.** The app reads stock, then writes a new number. Two people pulling the same item at the same second could produce a wrong count. A database function doing `stock = stock - qty` would fix it.
6. `@vercel/analytics` is installed in `package.json` but not used anywhere. Remove it or add `<Analytics />` in `inventory-app > src > main.tsx`.
7. `seedEmployees` in `inventory-app > src > data > mockData.ts` is leftover demo data. The Employees page uses the real staff list.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Login page shows no names | `.env` missing or wrong, or `schema.sql` was not run. Check Step 2 and Step 3, then restart `npm run dev`. |
| App shows demo data / nothing saves | Same as above. The app falls back to `mockData.ts` when env variables are empty. |
| Works locally but not on Vercel | Env variables missing in Vercel, or you added them after deploying. Add them and **Redeploy**. |
| "You don't have permission to do that" | Grants or policies missing. Re-run `schema.sql` on a **fresh** project, or re-run only the policy/grant section on the live one. |
| `function crypt(...) does not exist` | pgcrypto not enabled. Run `create extension if not exists pgcrypto;` |
| "Cannot delete the last remaining admin account" | Working as intended. Promote another person to admin first. |
| Error deleting a staff member | See Known issue #2. |
| Data stopped loading after a quiet week | Supabase free project paused. Restore it in the dashboard. |
| `npm run build` fails with TypeScript errors | Fix the reported file. Vercel runs the same command, so it will fail there too. |
| Port 5173 already in use | Close the other terminal, or change the port in `inventory-app > vite.config.ts`. |

---

## npm scripts

| Command | Does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server (http://localhost:5173) |
| `npm run build` | Type-check and build to `dist` |
| `npm run preview` | Serve the built `dist` folder locally |
