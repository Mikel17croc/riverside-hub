import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

/**
 * Creates a Supabase client authenticated AS THE CALLING USER (their JWT is
 * attached to every request). This means every query still passes through
 * Postgres Row Level Security — the API does not just trust its own role
 * checks, RLS is the real enforcement boundary. Use this for all normal
 * reads/writes; reach for supabaseAdmin only for privileged operations that
 * legitimately need to cross RLS (e.g. looking up another user's profile
 * during an admin action, which is itself gated by an app-level role check).
 */
export function supabaseForUser(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
