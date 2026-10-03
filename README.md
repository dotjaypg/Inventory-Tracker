# InvenTrack (Inventory Tracker)

Inventory app for the Creative Department. Staff sign in with their name and a PIN to pull out, borrow, return, and restock items.

> ## ⚠️ Read this first before you clone
>
> 1. **Clone the `staging` branch.** It is the latest and working version. `main` is older.
>    ```
>    git clone -b staging https://github.com/itsronsairojordan-hub/Inventory-Tracker.git inventory-app
>    ```
> 2. **Never run `schema.sql` on the live database.** It deletes all tables first. Only run it on a new, empty Supabase project.
> 3. **Never put the Supabase `service_role` (secret) key in the app.** Only use the `anon` / publishable key.
> 4. **Change the default Admin PIN (`0000`)** right after your first login.

File paths below are written as `main folder > subfolder > file`.

---

## Step 1: Install

1. Install **Node.js 20+** and **Git**.
2. Clone the repo (command in the box above), then:
   ```
   cd inventory-app
   npm install
   ```

## Step 2: Build the database (Supabase)

> Taking over the existing live database instead? Skip to **Step 5**.

1. Go to https://supabase.com and click **New project**. Region: **Singapore**. Save the database password.
2. Open **SQL Editor > New query**.
3. Copy everything in `inventory-app > supabase > schema.sql`, paste it, and click **Run**.
4. Open **Table Editor** and check that these 6 tables exist: `staff`, `items`, `logs`, `restocks`, `damage_records`, `app_settings`.

This also creates the default login: **Admin** / PIN **0000**.

## Step 3: Connect the app

1. In Supabase, go to **Project Settings > API** and copy the **Project URL** and the **anon public key**.
2. Create the file `inventory-app > .env` with:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the app:
   ```
   npm run dev
   ```
4. Open http://localhost:5173 and log in as **Admin** / **0000**.
5. Go to **Settings > Staff & PINs**, change the Admin PIN, and add the staff.

> If the app shows demo data or the login has no names, your `.env` is wrong. Fix it and restart `npm run dev`.

## Step 4: Deploy (Vercel)

1. Go to https://vercel.com, click **Add New > Project**, and import the repo.
2. Framework: **Vite**. Build command: `npm run build`. Output folder: `dist`.
3. Add the same 2 environment variables from your `.env`.
4. Click **Deploy**.

> If you change an environment variable later, you must **Redeploy** for it to take effect.

## Step 5: Taking over the existing database

The easiest way is to have the old owner **transfer the Supabase project** to you:
**Project Settings > General > Transfer project**.
The URL and keys stay the same, so nothing in the app or Vercel needs to change. After the transfer, reset the database password and save it.

---

## Project structure

```
inventory-app
├── .env                  Supabase URL + key (not in Git)
├── supabase
│   └── schema.sql        The whole database (tables, PIN functions, permissions)
└── src
    ├── App.tsx           Sidebar and which pages admin/staff can see
    ├── types.ts          Data types and categories
    ├── lib
    │   └── supabase.ts   Supabase connection
    ├── context
    │   ├── AuthContext.tsx       Login, staff, PINs, roles
    │   └── InventoryContext.tsx  All database reads and writes
    └── pages             One file per screen (Inventory, Requests, Restock, etc.)
```

## Good to know

- **The PIN login is not strong security.** Anyone with the anon key could change PINs through the database. It is fine for an internal tool, but do not store sensitive data in it.
- **Deleting a staff member who has history will fail.** To fix it, run this once in the SQL Editor:
  ```sql
  alter table logs drop constraint logs_staff_id_fkey;
  alter table logs add constraint logs_staff_id_fkey
    foreign key (staff_id) references staff(id) on delete set null;
  alter table restocks drop constraint restocks_staff_id_fkey;
  alter table restocks add constraint restocks_staff_id_fkey
    foreign key (staff_id) references staff(id) on delete set null;
  ```
- **Photos and receipts are saved inside the database**, so they use up the 500 MB free limit quickly. Check the storage bar in **Settings**.
- **Free Supabase projects pause after about a week of no use.** If data stops loading, open the Supabase dashboard and click **Restore project**.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally |
| `npm run build` | Build for production (run this before pushing to check for errors) |
