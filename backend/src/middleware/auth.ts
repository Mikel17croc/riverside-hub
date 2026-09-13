import { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { UserRole } from '../types';

/**
 * Verifies the `Authorization: Bearer <access_token>` header against
 * Supabase Auth, then loads the caller's role from `profiles` and attaches
 * both to req.auth. Also stashes the raw access token on req so downstream
 * handlers can build a user-scoped Supabase client (RLS-enforced) via
 * supabaseForUser().
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    const accessToken = header.slice('Bearer '.length);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'No profile found for this user' });
    }

    req.auth = {
      userId: userData.user.id,
      role: profile.role as UserRole,
      email: userData.user.email ?? undefined,
    };
    (req as any).accessToken = accessToken;
    next();
  } catch (err) {
    next(err);
  }
}

/** Restricts a route to one or more roles. Must run after requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
}

/**
 * Like requireAuth, but does not fail if there's no/invalid token — used on
 * public routes (e.g. donations) that behave slightly differently for a
 * logged-in donor vs. an anonymous one.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const accessToken = header.slice('Bearer '.length);
  const { data } = await supabaseAdmin.auth.getUser(accessToken);
  if (data?.user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    req.auth = {
      userId: data.user.id,
      role: (profile?.role as UserRole) ?? 'member',
      email: data.user.email ?? undefined,
    };
    (req as any).accessToken = accessToken;
  }
  next();
}
