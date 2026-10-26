// Server-side Supabase client with the service role: only used by API routes, never sent to the browser.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ModelError } from './meta.js';

export const EXPERIMENT_BUCKET = 'experiment-videos';

let client: SupabaseClient | null = null;

export const supabaseAdmin = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ModelError('Supabase storage is not configured on the server', 500);
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
};
