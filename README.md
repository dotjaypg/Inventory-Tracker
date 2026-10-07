# InvenTrack (Inventory Tracker)

Inventory app for the Creative Department. Staff sign in with their name and a PIN to pull out, borrow, return, and restock items. See **FEATURES.md** for what the app does.

> ## ⚠️ Read this first before you clone
>
> 1. **Clone the `staging` branch.** It is the latest and working version. `main` is older.
>    ```
>    git clone -b staging https://github.com/itsronsairojordan-hub/Inventory-Tracker.git inventory-app
>    ```
> 2. **Never run `schema.sql` on the live database.** It deletes all tables first. For an existing database, run `upgrade.sql` instead.
> 3. **Never put the Supabase `service_role` (secret) key in the app.** Only use the `anon` / publishable key.
> 4. **Change the default Admin PIN (`0000`)** right after your first login.

File paths are written as `main folder > subfolder > file`.

---

## Step 1: Install

1. Install **Node.js 20+** from https://nodejs.org (this also installs `npm`) and **Git**. Check:
   ```
   node -v
   npm -v
   ```
2. Clone (command above), then:
   ```
   cd inventory-app
   npm install
   ```

> `npm install` downloads every package the app needs into `inventory-app > node_modules` (only inside the project). Needs internet the first time. Run it once, or again when `package.json` changes. Never commit `node_modules`.

## Step 2: Database (Supabase)

**New project:**
1. https://supabase.com > **New project**. Region: **Singapore**. Save the database password.
2. **SQL Editor > New query**, paste all of `inventory-app > supabase > schema.sql`, click **Run**.
3. **Table Editor** should show: `staff`, `items`, `logs`, `restocks`, `damage_records`, `app_settings`.

This creates the default login **Admin / 0000**.

**Existing (live) database:** paste all of `inventory-app > supabase > upgrade.sql` and click **Run**. It is safe: it never deletes data, and can be run more than once. Run it on **both** staging and production after pulling new code.

## Step 3: Connect the app

1. Supabase > **Project Settings > API**: copy the **Project URL** and **anon public key**.
2. Create `inventory-app > .env`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run `npm run dev`, open http://localhost:5173, log in as **Admin / 0000**.
4. **Settings > Staff & PINs**: change the Admin PIN and add staff.

> Login reports a staff-list error or the app shows demo data? Check that the `.env` URL and anon key point to the correct Supabase project, then restart `npm run dev` (or redeploy). If the login says there are no staff accounts, verify that the `staff_public` view has rows. Only use `schema.sql` for a new project; it deletes existing data.

## Step 4: Deploy (Vercel)

1. https://vercel.com > **Add New > Project** > import the repo.
2. Framework **Vite**, build `npm run build`, output `dist`.
3. Add the 2 variables from `.env`, then **Deploy**.

> After changing a variable, **Redeploy**. After a new deploy, users press **Ctrl + Shift + R** to load it.

## Step 5: Taking over an existing project

Ask the old owner to **transfer the Supabase project** (**Project Settings > General > Transfer project**). URL and keys stay the same. Then reset the database password and run `upgrade.sql`.

---

## Project structure

```
inventory-app
├── .env                        Supabase URL + key (not in Git)
├── supabase
│   ├── schema.sql              NEW projects only (deletes everything first)
│   └── upgrade.sql             EXISTING databases (safe, no data loss)
└── src
    ├── App.tsx                 Sidebar, pages, admin vs staff access
    ├── types.ts                Data types and categories
    ├── context
    │   ├── AuthContext.tsx     PIN login, session, staff, roles
    │   └── InventoryContext.tsx  All database reads and writes
    ├── lib
    │   ├── csv.ts              Import/export format, dated file names
    │   ├── report.ts           Monthly report (used + bought)
    │   ├── notifications.ts    Bell alerts
    │   ├── history.ts          "Clear history" reminder
    │   └── dates.ts            Local date (Philippine time)
    ├── components              Popups and small UI pieces
    └── pages                   Dashboard, Inventory, AddItem, Requests,
                                RestockPage, Employees, Reports, Settings, Login
```

## Good to know

- **PIN login is not strong security.** Anyone with the anon key could change data through the database. Fine for an internal tool, not for sensitive data.
- **Photos and receipts are stored inside the database** and use the 500 MB free limit. Watch the storage bar in **Settings > Database**.
- **Free Supabase projects pause after about a week unused.** If data stops loading, click **Restore project** in Supabase.
- **Costs need a pack price.** Items without one show "No price set" in Reports. Old pull-outs keep the price they had at the time.
- **Stock changes are done in one database step** (`adjust_stock`), so two people can't overwrite each other and stock never goes below 0. Needs `upgrade.sql`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally |
| `npm run build` | Build for production (run before pushing to catch errors) |
