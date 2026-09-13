import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseForUser } from '../lib/supabaseForUser';
import { ApiHttpError } from '../middleware/errorHandler';

export const notificationsRouter = Router();

// GET /api/notifications — the logged-in user's own notifications
notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = supabaseForUser((req as any).accessToken);
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', req.auth!.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const db = supabaseForUser((req as any).accessToken);
    const { data, error } = await db
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.auth!.userId)
      .select()
      .single();
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
