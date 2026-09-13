import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { createDonationSchema, getPagination } from '../utils/validation';
import { ApiHttpError } from '../middleware/errorHandler';

export const donationsRouter = Router();

// POST /api/donations — public (donation form). Works for logged-in members
// (donor_id set) and anonymous/guest donors (donor_name/email captured instead).
donationsRouter.post('/', optionalAuth, async (req, res, next) => {
  try {
    const body = createDonationSchema.parse(req.body);

    if (!req.auth && !body.donor_name && !body.donor_email) {
      throw new ApiHttpError(400, 'donor_name or donor_email is required for anonymous donations');
    }

    const { data, error } = await supabaseAdmin
      .from('donations')
      .insert({
        ...body,
        donor_id: req.auth?.userId ?? null,
      })
      .select()
      .single();

    if (error) throw new ApiHttpError(400, error.message);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/donations/mine — a logged-in donor's own donation history
donationsRouter.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('donor_id', req.auth!.userId)
      .order('created_at', { ascending: false });
    if (error) throw new ApiHttpError(400, error.message);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/donations — staff/admin, paginated
donationsRouter.get('/', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  try {
    const { page, pageSize, from, to } = getPagination(req);
    const { data, error, count } = await supabaseAdmin
      .from('donations')
      .select('*, campaign:campaigns(title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw new ApiHttpError(400, error.message);
    res.json({ data, page, pageSize, total: count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// GET /api/donations/export.csv — staff/admin
donationsRouter.get('/export.csv', requireAuth, requireRole('staff', 'admin'), async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('donations')
      .select('id, donor_name, donor_email, amount, type, campaign_id, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new ApiHttpError(400, error.message);

    const header = 'id,donor_name,donor_email,amount,type,campaign_id,created_at';
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = (data ?? []).map((d) =>
      [d.id, d.donor_name, d.donor_email, d.amount, d.type, d.campaign_id, d.created_at]
        .map(escape)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
