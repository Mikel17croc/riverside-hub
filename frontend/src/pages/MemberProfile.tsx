import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import type { Profile } from '../types';
import { ErrorState } from '../components/EmptyState';

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function MemberProfile() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const expiringInDays = daysUntil(profile.membership_expires_at);
  const expiringSoon = expiringInDays !== null && expiringInDays <= 30 && expiringInDays >= 0;
  const expired = expiringInDays !== null && expiringInDays < 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await api.patch<Profile>('/profiles/me', { full_name: fullName, phone: phone || null });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-gray-500">Membership tier</dt>
          <dd className="font-medium capitalize">{profile.membership_tier}</dd>
          <dt className="text-gray-500">Member since</dt>
          <dd className="font-medium">{new Date(profile.joined_at).toLocaleDateString()}</dd>
          <dt className="text-gray-500">Status</dt>
          <dd>
            {expired ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Expired
              </span>
            ) : expiringSoon ? (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Expiring in {expiringInDays} day{expiringInDays === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            )}
          </dd>
        </dl>
        {(expired || expiringSoon) && (
          <p className="mt-3 text-xs text-gray-500">
            Contact reception to renew your membership — renewals are processed by staff.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-semibold">Contact details</h2>
        {error && <ErrorState message={error} />}
        {saved && <p className="text-sm text-green-700">Saved!</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            value={phone ?? ''}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-river-600 px-4 py-2 font-medium text-white hover:bg-river-700"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
