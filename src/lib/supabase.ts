import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// This client is ready to use once you create a free Supabase project and
// add your keys to a .env file (see .env.example).
//
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
//
// Until then, the app runs entirely on in-memory mock data (see
// src/context/InventoryContext.tsx) so it works immediately with no setup.
//
// To wire up real persistence later:
//   1. Create `items`, `logs`, and `employees` tables in Supabase matching
//      the shapes in src/types.ts.
//   2. In InventoryContext.tsx, replace the useState() seed loads with
//      supabase.from('items').select('*') (and similar for logs/employees).
//   3. Replace each mutating function (addItem, borrowItem, turnBackItem)
//      with a supabase .insert() / .update() call, then update local state
//      from the response so the UI stays in sync.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
