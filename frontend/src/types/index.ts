export type UserRole = 'member' | 'staff' | 'admin';
export type MembershipTier = 'free' | 'standard' | 'family';
export type ResourceType = 'room' | 'equipment';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type DonationType = 'one_off' | 'recurring_pledge';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  membership_tier: MembershipTier;
  joined_at: string;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  category: string;
  capacity: number | null;
  description: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  member_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  resource?: Resource;
  member?: Pick<Profile, 'id' | 'full_name'>;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  active: boolean;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  amount: number;
  type: DonationType;
  campaign_id: string | null;
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
