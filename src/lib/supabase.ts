import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null until the Supabase project is configured; the app then runs in guest mode only. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
