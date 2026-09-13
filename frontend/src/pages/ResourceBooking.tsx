import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Booking, Resource } from '../types';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/EmptyState';

export function ResourceBooking() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [resource, setResource] = useState<Resource | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayBookings, setDayBookings] = useState<Pick<Booking, 'id' | 'start_time' | 'end_time' | 'status'>[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Resource[]>('/resources').then((all) => {
      setResource(all.find((r) => r.id === id) ?? null);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api
      .get<typeof dayBookings>(`/resources/${id}/availability?date=${date}`)
      .then(setDayBookings)
      .catch(() => setDayBookings([]));
  }, [id, date]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!id) return;
    setSubmitting(true);
    try {
      const start_time = new Date(`${date}T${startTime}:00`).toISOString();
      const end_time = new Date(`${date}T${endTime}:00`).toISOString();
      await api.post<Booking>('/bookings', { resource_id: id, start_time, end_time, notes });
      setSuccess('Booking request submitted. You will be notified once staff review it.');
      setNotes('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  }

  if (!resource) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <span className="text-xs font-medium uppercase tracking-wide text-river-600">
        {resource.category}
      </span>
      <h1 className="mt-1 text-2xl font-semibold">{resource.name}</h1>
      <p className="mt-2 text-gray-600">{resource.description}</p>
      {resource.capacity && <p className="mt-1 text-sm text-gray-500">Capacity: {resource.capacity}</p>}

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">Bookings on this day</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <ul className="mt-3 space-y-2 text-sm">
            {dayBookings.length === 0 && <li className="text-gray-500">No bookings yet — fully open.</li>}
            {dayBookings.map((b) => (
              <li key={b.id} className="rounded border border-gray-200 px-3 py-2">
                {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">{b.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">Request a booking</h2>
          {!session ? (
            <p className="mt-3 text-sm text-gray-600">Please log in as a member to request a booking.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              {error && <ErrorState message={error} />}
              {success && (
                <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700">Start</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700">End</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded bg-river-600 px-4 py-2 font-medium text-white hover:bg-river-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Request booking'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
