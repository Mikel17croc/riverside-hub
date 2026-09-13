import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { ApiHttpError } from '../middleware/errorHandler';

export const adminRouter = Router();

// GET /api/admin/summary — staff/admin dashboard KPIs
adminRouter.get('/summary', requireAuth, requireRole('staff', 'admin'), async (_req, res, next) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      { count: pendingBookings, error: e1 },
      { count: bookingsThisMonth, error: e2 },
      { count: activeMembers, error: e3 },
      { data: donationSum, error: e4 },
      { count: totalMembers, error: e5 },
    ] = await Promise.all([
      supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString()),
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('membership_expires_at', new Date().toISOString()),
      supabaseAdmin.from('donations').select('amount'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    ]);

    const firstError = e1 || e2 || e3 || e4 || e5;
    if (firstError) throw new ApiHttpError(400, firstError.message);

    const totalDonations = (donationSum ?? []).reduce((sum, d) => sum + Number(d.amount), 0);

    res.json({
      pendingBookings: pendingBookings ?? 0,
      bookingsThisMonth: bookingsThisMonth ?? 0,
      activeMembers: activeMembers ?? 0,
      totalMembers: totalMembers ?? 0,
      totalDonations,
    });
  } catch (err) {
    next(err);
  }
});
