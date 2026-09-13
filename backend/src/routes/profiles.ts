import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseForUser } from '../lib/supabaseForUser';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { getPagination, updateMemberByStaffSchema, updateProfileSchema } from '../utils/validation';
import { ApiHttpError } from '../middleware/errorHandler';

export const profilesRouter = Router();

// GET /api/profiles/me
profilesRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const db = supabaseForUser((req as any).accessToken);
    const { data, error } = await db.from('profiles').select('*').eq('id', req.auth!.userId).single();
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/me
profilesRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const db = supabaseForUser((req as any).accessToken);
    const { data, error } = await db
      .from('profiles')
      .update(body)
      .eq('id', req.auth!.userId)
      .select()
      .single();
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles — member directory, staff/admin only, paginated + searchable
profilesRouter.get('/', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  try {
    const { page, pageSize, from, to } = getPagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('joined_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new ApiHttpError(400, error.message);
    res.json({ data, page, pageSize, total: count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/:id — staff/admin edits a member's tier/expiry; admin-only can change role
profilesRouter.patch('/:id', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  try {
    const body = updateMemberByStaffSchema.parse(req.body);
    if (body.role && req.auth!.role !== 'admin') {
      throw new ApiHttpError(403, 'Only admins can change a user\'s role');
    }
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
