import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { FinancialGoal, FinancialGoalStatus, Asset, ExchangeRate, MonthlyFinance } from '../../lib/types';
import { toDkk, formatDkk } from '../../lib/currency';
import ProgressBar from '../../components/ProgressBar';
import { Plus, Trash2 } from 'lucide-react';

const STATUSES: FinancialGoalStatus[] = ['On track', 'Behind', 'Achieved'];

const STATUS_STYLE: Record<FinancialGoalStatus, string> = {
  'On track': 'bg-harbor/10 text-harbor-dark',
  Behind: 'bg-rust/10 text-rust',
  Achieved: 'bg-moss text-white',
};

export default function FinancialGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [monthlySavings, setMonthlySavings] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: goalData }, { data: assetData }, { data: rateData }, { data: financeData }] = await Promise.all([
      supabase.from('financial_goals').select('*').eq('user_id', user!.id),
      supabase.from('assets').select('*').eq('user_id', user!.id),
      supabase.from('exchange_rates').select('*').eq('user_id', user!.id),
      supabase.from('monthly_finance').select('*').eq('user_id', user!.id),
    ]);
    setGoals(goalData ?? []);
    setAssets(assetData ?? []);
    setRates(rateData ?? []);
    const withSavings = ((financeData ?? []) as MonthlyFinance[])
      .filter((m) => m.savings_dkk != null)
      .sort((a, b) => b.month.localeCompare(a.month));
    setMonthlySavings(withSavings[0]?.savings_dkk ?? null);
    setLoading(false);
  }

  async function addGoal() {
    const { data } = await supabase
      .from('financial_goals')
      .insert({
        user_id: user!.id,
        name: 'New goal',
        target_amount: 0,
        target_date: null,
        current_amount: 0,
        linked_pot_id: null,
        notes: null,
        status: 'On track',
      })
      .select()
      .single();
    if (data) setGoals((prev) => [...prev, data]);
  }

  async function updateGoal(id: string, patch: Partial<FinancialGoal>) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    await supabase.from('financial_goals').update(patch).eq('id', id);
  }

  async function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from('financial_goals').delete().eq('id', id);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft">Financial goals</h2>
        {monthlySavings != null && (
          <span className="font-mono text-xs text-ink-soft">
            Estimating from {formatDkk(monthlySavings)} DKK/month saved
          </span>
        )}
      </div>

      {goals.length === 0 && (
        <p className="text-sm text-ink-soft mb-4">No financial goals yet — add one below.</p>
      )}

      <div className="space-y-4 mb-4">
        {goals.map((goal) => {
          const linkedAsset = goal.linked_pot_id ? assets.find((a) => a.id === goal.linked_pot_id) : undefined;
          const currentAmount = linkedAsset
            ? toDkk(linkedAsset.balance, linkedAsset.currency, rates)
            : goal.current_amount;
          const remaining = Math.max(0, goal.target_amount - currentAmount);
          const progressPct = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;
          const estMonths =
            monthlySavings && monthlySavings > 0 && remaining > 0 ? Math.ceil(remaining / monthlySavings) : null;

          return (
            <div key={goal.id} className="border border-line rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <input
                  value={goal.name}
                  onChange={(e) => void updateGoal(goal.id, { name: e.target.value })}
                  className="font-display text-lg outline-none bg-transparent flex-1 focus:bg-paper-dim/40 rounded-sm px-1 -mx-1"
                />
                <select
                  value={goal.status}
                  onChange={(e) => void updateGoal(goal.id, { status: e.target.value as FinancialGoalStatus })}
                  className={`shrink-0 px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${STATUS_STYLE[goal.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Target (DKK)</span>
                  <input
                    type="number"
                    value={goal.target_amount}
                    onChange={(e) => void updateGoal(goal.id, { target_amount: Number(e.target.value) || 0 })}
                    className="w-full border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                  />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Target date</span>
                  <input
                    type="date"
                    value={goal.target_date ?? ''}
                    onChange={(e) => void updateGoal(goal.id, { target_date: e.target.value || null })}
                    className="w-full border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                  />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Linked pot</span>
                  <select
                    value={goal.linked_pot_id ?? ''}
                    onChange={(e) => void updateGoal(goal.id, { linked_pot_id: e.target.value || null })}
                    className="w-full border border-line rounded-sm px-2 py-1 text-xs outline-none focus:border-harbor"
                  >
                    <option value="">Manual entry</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Current (DKK)</span>
                  {linkedAsset ? (
                    <div className="px-2 py-1 font-mono text-xs text-ink-soft">
                      {formatDkk(currentAmount)} · from {linkedAsset.name}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={goal.current_amount}
                      onChange={(e) => void updateGoal(goal.id, { current_amount: Number(e.target.value) || 0 })}
                      className="w-full border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                    />
                  )}
                </label>
              </div>

              <ProgressBar value={progressPct} />
              <div className="flex items-center justify-between mt-1.5 mb-3 font-mono text-xs text-ink-soft">
                <span>{Math.round(progressPct)}%</span>
                <span>
                  {formatDkk(remaining)} DKK remaining
                  {estMonths != null ? ` · ~${estMonths} month${estMonths === 1 ? '' : 's'} at current rate` : ''}
                </span>
              </div>

              <textarea
                value={goal.notes ?? ''}
                onChange={(e) => void updateGoal(goal.id, { notes: e.target.value || null })}
                onBlur={(e) => void updateGoal(goal.id, { notes: e.target.value || null })}
                placeholder="Notes…"
                rows={2}
                className="w-full border border-line rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-harbor resize-none mb-2"
              />

              <button
                onClick={() => void removeGoal(goal.id)}
                className="flex items-center gap-1.5 text-ink-soft hover:text-rust text-xs"
              >
                <Trash2 className="w-3 h-3" />
                Remove goal
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => void addGoal()}
        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line border-dashed rounded-sm bg-white text-sm text-ink-soft hover:text-harbor hover:border-harbor w-full"
      >
        <Plus className="w-3.5 h-3.5" />
        Add financial goal
      </button>
    </div>
  );
}
