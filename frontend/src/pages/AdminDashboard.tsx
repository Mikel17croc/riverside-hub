import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import type { Campaign } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/EmptyState';

interface Summary {
  pendingBookings: number;
  bookingsThisMonth: number;
  activeMembers: number;
  totalMembers: number;
  totalDonations: number;
}

export function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Summary>('/admin/summary').then(setSummary).catch((err) => setError(err.message));
    api.get<Campaign[]>('/campaigns').then(setCampaigns);
  }, []);

  async function downloadCsv() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const base = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000/api';
    const res = await fetch(`${base}/donations/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'donations.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <ErrorState message={error} />;
  if (!summary || !campaigns) return <LoadingSpinner />;

  const cards = [
    { label: 'Pending bookings', value: summary.pendingBookings },
    { label: 'Bookings this month', value: summary.bookingsThisMonth },
    { label: 'Active members', value: `${summary.activeMembers} / ${summary.totalMembers}` },
    { label: 'Total donations', value: `R${summary.totalDonations.toLocaleString()}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <button
          onClick={downloadCsv}
          className="rounded bg-river-600 px-4 py-2 text-sm font-medium text-white hover:bg-river-700"
        >
          Export donations (CSV)
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-river-700">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-semibold">Campaigns</h2>
        <div className="mt-3 space-y-3">
          {campaigns.map((c) => {
            const pct = Math.min(100, Math.round((c.current_amount / c.goal_amount) * 100));
            return (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.title}</p>
                  <span className={`text-xs ${c.active ? 'text-green-700' : 'text-gray-400'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-river-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  R{c.current_amount.toLocaleString()} of R{c.goal_amount.toLocaleString()} ({pct}%)
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-xs text-gray-400">
        Staff-account and role management, and new campaign creation, are available via the API
        (see docs/API.md) and can be wired into this dashboard as a next iteration.
      </p>
    </div>
  );
}
