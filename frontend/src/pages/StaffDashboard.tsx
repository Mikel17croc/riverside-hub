import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Booking, Paginated, Profile } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/EmptyState';

export function StaffDashboard() {
  const [pending, setPending] = useState<Paginated<Booking> | null>(null);
  const [members, setMembers] = useState<Paginated<Profile> | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  function loadPending() {
    api
      .get<Paginated<Booking>>('/bookings?status=pending')
      .then(setPending)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load bookings'));
  }

  function loadMembers(q: string) {
    api
      .get<Paginated<Profile>>(`/profiles?search=${encodeURIComponent(q)}`)
      .then(setMembers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load members'));
  }

  useEffect(() => {
    loadPending();
    loadMembers('');
  }, []);

  async function decide(id: string, status: 'approved' | 'rejected') {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      loadPending();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update booking');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Staff Dashboard</h1>
      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Pending bookings</h2>
        {!pending ? (
          <LoadingSpinner />
        ) : pending.data.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No pending bookings" hint="New requests will show up here for approval." />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {pending.data.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">
                    {b.resource?.name} — {b.member?.full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(b.start_time).toLocaleString()} – {new Date(b.end_time).toLocaleTimeString()}
                  </p>
                  {b.notes && <p className="mt-1 text-xs text-gray-500">Notes: {b.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(b.id, 'approved')}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(b.id, 'rejected')}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Member directory</h2>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadMembers(e.target.value);
            }}
            placeholder="Search by name…"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        {!members ? (
          <LoadingSpinner />
        ) : members.data.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No members found" />
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Tier</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.data.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">{m.full_name}</td>
                    <td className="px-4 py-2 capitalize">{m.membership_tier}</td>
                    <td className="px-4 py-2 capitalize">{m.role}</td>
                    <td className="px-4 py-2">{new Date(m.joined_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
