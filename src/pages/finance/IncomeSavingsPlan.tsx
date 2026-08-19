import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { MonthlyFinance } from '../../lib/types';

interface Band {
  from: string;
  to: string;
  low: number;
  high: number;
  label: string;
}

const BANDS: Band[] = [
  { from: '2026-08-01', to: '2026-09-30', low: 0, high: 0, label: 'Pre-job' },
  { from: '2026-10-01', to: '2027-01-31', low: 6800, high: 9450, label: 'First job, no SU' },
  { from: '2027-02-01', to: '2027-06-30', low: 9450, high: 12600, label: 'Job + SU' },
  { from: '2027-07-01', to: '2027-08-31', low: 12600, high: 16000, label: 'Full-time summer (illustrative)' },
  { from: '2027-09-01', to: '2028-06-30', low: 10000, high: 13000, label: 'Better-aligned role' },
];

function bandFor(monthISO: string): Band | undefined {
  return BANDS.find((b) => monthISO >= b.from && monthISO <= b.to);
}

function monthRange(startISO: string, endISO: string): string[] {
  const months: string[] = [];
  const cursor = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function formatMonth(monthISO: string): string {
  return new Date(monthISO + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function IncomeSavingsPlan() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, MonthlyFinance>>({});
  const [loading, setLoading] = useState(true);
  const months = useMemo(() => monthRange('2026-08-01', '2028-08-01'), []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('monthly_finance').select('*').eq('user_id', user!.id);
    const map: Record<string, MonthlyFinance> = {};
    for (const row of data ?? []) map[row.month] = row;
    setRows(map);
    setLoading(false);
  }

  async function saveMonth(month: string, patch: { actual_net_income_dkk?: number | null; savings_dkk?: number | null }) {
    const existing = rows[month];
    const merged = {
      actual_net_income_dkk: existing?.actual_net_income_dkk ?? null,
      savings_dkk: existing?.savings_dkk ?? null,
      ...patch,
    };
    const { data } = await supabase
      .from('monthly_finance')
      .upsert({ user_id: user!.id, month, ...merged, id: existing?.id || undefined }, { onConflict: 'user_id,month' })
      .select()
      .single();
    if (data) setRows((prev) => ({ ...prev, [month]: data }));
  }

  const chartData = months.map((m) => {
    const band = bandFor(m);
    const actual = rows[m]?.actual_net_income_dkk ?? null;
    return {
      month: formatMonth(m),
      actual,
      bandLow: band?.low ?? null,
      bandHigh: band?.high ?? null,
    };
  });

  const latestMonthWithData = [...months].reverse().find((m) => rows[m]?.actual_net_income_dkk != null);
  const currentIncome = latestMonthWithData ? rows[latestMonthWithData]?.actual_net_income_dkk : null;
  const currentSavings = latestMonthWithData ? rows[latestMonthWithData]?.savings_dkk : null;
  const savingsRate =
    currentIncome && currentSavings != null && currentIncome > 0
      ? Math.round((currentSavings / currentIncome) * 100)
      : null;
  const savingsTargetPhase = latestMonthWithData ? latestMonthWithData >= '2027-02-01' : false;
  const belowTarget = savingsTargetPhase && savingsRate != null && savingsRate < 40;

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <p className="text-ink-soft mb-4 text-sm">
        Actual income against the plan's own illustrative bands — ranges, not guarantees. Edit any month below.
      </p>

      {savingsRate != null && (
        <div
          className={`inline-block mb-4 px-4 py-2 rounded-sm font-mono text-sm ${
            belowTarget ? 'bg-rust/10 text-rust' : 'bg-moss/10 text-moss'
          }`}
        >
          Savings rate ({formatMonth(latestMonthWithData!)}): {savingsRate}%
          {savingsTargetPhase && ' · target 40–50%'}
        </div>
      )}

      <div className="border border-line rounded-sm bg-white p-4 mb-6" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#d8dcda" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
            <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 12, borderRadius: 2 }} />
            <Line type="stepAfter" dataKey="bandHigh" stroke="#d8dcda" strokeWidth={1} dot={false} name="Model high" />
            <Line
              type="stepAfter"
              dataKey="bandLow"
              stroke="#d8dcda"
              strokeWidth={1}
              dot={false}
              strokeDasharray="3 3"
              name="Model low"
            />
            <Bar dataKey="actual" fill="#822200" radius={[2, 2, 0, 0]} name="Actual net income" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-line rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-dim/50 text-left">
              <th className="font-medium px-4 py-2">Month</th>
              <th className="font-medium px-4 py-2">Model band (DKK)</th>
              <th className="font-medium px-4 py-2 w-36">Actual income (DKK)</th>
              <th className="font-medium px-4 py-2 w-36">Saved (DKK)</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const band = bandFor(m);
              const row = rows[m];
              return (
                <tr key={m} className="border-b border-line last:border-0">
                  <td className="px-4 py-1.5 font-mono text-xs">{formatMonth(m)}</td>
                  <td className="px-4 py-1.5 font-mono text-xs text-ink-soft">
                    {band ? `${band.low.toLocaleString()}–${band.high.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row?.actual_net_income_dkk ?? ''}
                      onChange={(e) =>
                        void saveMonth(m, { actual_net_income_dkk: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row?.savings_dkk ?? ''}
                      onChange={(e) => void saveMonth(m, { savings_dkk: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                      placeholder="—"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
