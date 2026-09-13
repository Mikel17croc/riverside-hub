import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Campaign, Donation } from '../types';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/EmptyState';

export function Donate() {
  const { session, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [amount, setAmount] = useState('250');
  const [type, setType] = useState<'one_off' | 'recurring_pledge'>('one_off');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Campaign[]>('/campaigns').then((cs) => {
      setCampaigns(cs);
      const active = cs.find((c) => c.active);
      if (active) setCampaignId(active.id);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<Donation>('/donations', {
        amount: Number(amount),
        type,
        campaign_id: campaignId || null,
        donor_name: session ? undefined : donorName || undefined,
        donor_email: session ? undefined : donorEmail || undefined,
        message,
      });
      setSuccess(true);
      const cs = await api.get<Campaign[]>('/campaigns');
      setCampaigns(cs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit donation');
    } finally {
      setSubmitting(false);
    }
  }

  if (!campaigns) return <LoadingSpinner />;

  const activeCampaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0];
  const pct = activeCampaign
    ? Math.min(100, Math.round((activeCampaign.current_amount / activeCampaign.goal_amount) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Support Riverside</h1>

      {activeCampaign && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">{activeCampaign.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{activeCampaign.description}</p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-river-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            R{activeCampaign.current_amount.toLocaleString()} raised of R
            {activeCampaign.goal_amount.toLocaleString()} goal ({pct}%)
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        {error && <ErrorState message={error} />}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Thank you for your generosity! Your donation has been recorded.
          </div>
        )}

        {campaigns.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (ZAR)</label>
          <input
            type="number"
            min={10}
            step={10}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Donation type</label>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={type === 'one_off'}
                onChange={() => setType('one_off')}
              />
              One-off
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={type === 'recurring_pledge'}
                onChange={() => setType('recurring_pledge')}
              />
              Adopt a food parcel (recurring pledge)
            </label>
          </div>
        </div>

        {!session && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Your name</label>
              <input
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Leave blank to donate anonymously"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        )}

        {session && (
          <p className="text-sm text-gray-500">Donating as {profile?.full_name ?? 'your account'}.</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-river-600 px-4 py-2 font-medium text-white hover:bg-river-700 disabled:opacity-60"
        >
          {submitting ? 'Processing…' : 'Donate'}
        </button>
        <p className="text-xs text-gray-400">
          Note: this demo logs donation intent for reporting purposes; no real payment is processed.
        </p>
      </form>
    </div>
  );
}
