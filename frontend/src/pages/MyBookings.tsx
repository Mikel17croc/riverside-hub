import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Booking, Paginated } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/EmptyState';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export function MyBookings() {
  const [result, setResult] = useState<Paginated<Booking> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<Paginated<Booking>>('/bookings/mine')
      .then(setResult)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load bookings'));
  }

  useEffect(load, []);

  async function cancelBooking(id: string) {
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'cancelled' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel booking');
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!result) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">My Bookings</h1>
      {result.data.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No bookings yet" hint="Browse facilities to request your first booking." />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {result.data.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{b.resource?.name ?? 'Resource'}</p>
                <p className="text-sm text-gray-600">
                  {new Date(b.start_time).toLocaleString()} – {new Date(b.end_time).toLocaleTimeString()}
                </p>
                {b.notes && <p className="mt-1 text-xs text-gray-500">Notes: {b.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[b.status]}`}>
                  {b.status}
                </span>
                {b.status === 'pending' && (
                  <button
                    onClick={() => cancelBooking(b.id)}
                    className="text-xs text-red-600 underline hover:text-red-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
