import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Resource } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/EmptyState';

export function Facilities() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'room' | 'equipment'>('all');

  useEffect(() => {
    api
      .get<Resource[]>('/resources')
      .then(setResources)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load facilities'));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!resources) return <LoadingSpinner />;

  const filtered = resources.filter((r) => filter === 'all' || r.type === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Facilities & Equipment</h1>
      <div className="mt-4 flex gap-2">
        {(['all', 'room', 'equipment'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filter === t ? 'bg-river-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {t === 'all' ? 'All' : t === 'room' ? 'Rooms' : 'Equipment'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No facilities found" hint="Try a different filter." />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to={`/facilities/${r.id}`}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-river-600">
                {r.category}
              </span>
              <h2 className="mt-1 font-semibold">{r.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{r.description}</p>
              {r.capacity && <p className="mt-2 text-xs text-gray-500">Capacity: {r.capacity}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
