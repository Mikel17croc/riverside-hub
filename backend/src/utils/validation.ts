import { z } from 'zod';
import { Request } from 'express';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function getPagination(req: Request) {
  const { page, pageSize } = paginationSchema.parse(req.query);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export const createBookingSchema = z.object({
  resource_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  notes: z.string().max(500).optional().default(''),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']),
});

export const createResourceSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['room', 'equipment']),
  category: z.string().min(2).max(80),
  capacity: z.number().int().positive().nullable().optional(),
  description: z.string().max(1000).optional().default(''),
  image_url: z.string().url().nullable().optional(),
});

export const updateResourceSchema = createResourceSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createDonationSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  type: z.enum(['one_off', 'recurring_pledge']).default('one_off'),
  campaign_id: z.string().uuid().nullable().optional(),
  donor_name: z.string().max(120).optional(),
  donor_email: z.string().email().optional(),
  message: z.string().max(500).optional().default(''),
});

export const createCampaignSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(1000).optional().default(''),
  goal_amount: z.number().positive(),
  active: z.boolean().optional().default(true),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
});

export const updateMemberByStaffSchema = z.object({
  membership_tier: z.enum(['free', 'standard', 'family']).optional(),
  membership_expires_at: z.string().datetime().nullable().optional(),
  role: z.enum(['member', 'staff', 'admin']).optional(),
});
