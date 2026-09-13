import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. See backend/.env.example.'
  );
}

/**
 * Service-role client. Bypasses Row Level Security — use ONLY in trusted
 * server code, and always after the request has been authenticated and
 * authorized in application code (see middleware/auth.ts and each route's
 * own role checks). NEVER send this key to the browser.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
