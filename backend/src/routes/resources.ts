import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { createResourceSchema, updateResourceSchema } from '../utils/validation';
import { ApiHttpError } from '../middleware/errorHandler';

export const resourcesRouter = Router();

// GET /api/resources — public catalogue (no auth required)
resourcesRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    let query = supabaseAdmin.from('resources').select('*').eq('active', true).order('name');
    if (type === 'room' || type === 'equipment') query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id/availability?date=YYYY-MM-DD — approved bookings for that day
resourcesRouter.get('/:id/availability', async (req, res, next) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    if (!date) throw new ApiHttpError(400, 'Query param "date" (YYYY-MM-DD) is required');

    const dayStart = new Date(`${date}T00:00:00.000Z`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59.999Z`).toISOString();

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('resource_id', req.params.id)
      .in('status', ['pending', 'approved'])
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time');

    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/resources — staff/admin only
resourcesRouter.post('/', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  try {
    const body = createResourceSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('resources').insert(body).select().single();
    if (error) throw new ApiHttpError(400, error.message);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/resources/:id — staff/admin only
resourcesRouter.patch('/:id', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  try {
    const body = updateResourceSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('resources')
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

// DELETE /api/resources/:id — admin only (soft delete via active=false is preferred)
resourcesRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.from('resources').delete().eq('id', req.params.id);
    if (error) throw new ApiHttpError(400, error.message);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
