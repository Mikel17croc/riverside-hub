import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseForUser } from '../lib/supabaseForUser';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import {
  createBookingSchema,
  getPagination,
  updateBookingStatusSchema,
} from '../utils/validation';
import { ApiHttpError } from '../middleware/errorHandler';

export const bookingsRouter = Router();

// GET /api/bookings/mine — the logged-in member's own bookings (RLS-enforced)
bookingsRouter.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { page, pageSize, from, to } = getPagination(req);
    const db = supabaseForUser((req as any).accessToken);
    const { data, error, count } = await db
      .from('bookings')
      .select('*, resource:resources(*)', { count: 'exact' })
      .eq('member_id', req.auth!.userId)
      .order('start_time', { ascending: false })
      .range(from, to);
    if (error) throw new ApiHttpError(400, error.message);
    res.json({ data, page, pageSize, total: count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings — staff/admin: all bookings, filterable by status
bookingsRouter.get('/', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  try {
    const { page, pageSize, from, to } = getPagination(req);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    let query = supabaseAdmin
      .from('bookings')
      .select('*, resource:resources(*), member:profiles(id, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new ApiHttpError(400, error.message);
    res.json({ data, page, pageSize, total: count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings — member requests a booking (status defaults to 'pending')
bookingsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createBookingSchema.parse(req.body);

    if (new Date(body.end_time) <= new Date(body.start_time)) {
      throw new ApiHttpError(400, 'end_time must be after start_time');
    }

    // Friendly pre-check so the member gets a clear message before hitting
    // the DB exclusion constraint (which is the real, race-proof guard).
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('resource_id', body.resource_id)
      .eq('status', 'approved')
      .lt('start_time', body.end_time)
      .gt('end_time', body.start_time);

    if (conflictError) throw new ApiHttpError(400, conflictError.message);
    if (conflicts && conflicts.length > 0) {
      throw new ApiHttpError(409, 'This resource is already booked for the selected time slot');
    }

    const db = supabaseForUser((req as any).accessToken);
    const { data, error } = await db
      .from('bookings')
      .insert({ ...body, member_id: req.auth!.userId, status: 'pending' })
      .select('*, resource:resources(*)')
      .single();

    if (error) {
      // Postgres exclusion constraint violation code
      if ((error as any).code === '23P01') {
        throw new ApiHttpError(409, 'This resource is already booked for the selected time slot');
      }
      throw new ApiHttpError(400, error.message);
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/status — approve/reject (staff/admin) or cancel (owner, if still pending)
bookingsRouter.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = updateBookingStatusSchema.parse(req.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (fetchError || !existing) throw new ApiHttpError(404, 'Booking not found');

    const isOwner = existing.member_id === req.auth!.userId;
    const isStaff = req.auth!.role === 'staff' || req.auth!.role === 'admin';

    if (status === 'cancelled') {
      if (!isOwner && !isStaff) throw new ApiHttpError(403, 'Not allowed to cancel this booking');
      if (isOwner && existing.status !== 'pending') {
        throw new ApiHttpError(400, 'Only pending bookings can be cancelled by the member');
      }
    } else {
      // approved / rejected — staff/admin only
      if (!isStaff) throw new ApiHttpError(403, 'Only staff or admin can approve or reject bookings');
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', req.params.id)
      .select('*, resource:resources(*)')
      .single();

    if (error) {
      if ((error as any).code === '23P01') {
        throw new ApiHttpError(409, 'Approving this booking would conflict with another approved booking');
      }
      throw new ApiHttpError(400, error.message);
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});
