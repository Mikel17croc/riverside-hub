import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { createCampaignSchema } from '../utils/validation';
import { ApiHttpError } from '../middleware/errorHandler';

export const campaignsRouter = Router();

// GET /api/campaigns — public
campaignsRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns — admin only
campaignsRouter.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = createCampaignSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({ ...body, current_amount: 0 })
      .select()
      .single();
    if (error) throw new ApiHttpError(400, error.message);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/campaigns/:id — admin only
campaignsRouter.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = createCampaignSchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('campaigns')
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
