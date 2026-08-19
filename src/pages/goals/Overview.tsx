import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type {
  LifeGoal,
  LifeGoalDomain,
  LifeGoalStatus,
  GoalCheckpoint,
  FinancialGoal,
  Asset,
  ExchangeRate,
} from '../../lib/types';
import { computeGoalProgress } from '../../lib/goalProgress';
import { Plus, Trash2 } from 'lucide-react';

const DOMAINS: LifeGoalDomain[] = ['Financial', 'Academic', 'Physical', 'Social & Relationships', 'Career', 'Personal'];
const STATUSES: LifeGoalStatus[] = ['Active', 'Achieved', 'Paused'];

const DOMAIN_STYLE: Record<LifeGoalDomain, string> = {
  Financial: 'bg-harbor/10 text-harbor-dark',
  Academic: 'bg-ink/10 text-ink',
  Physical: 'bg-moss/10 text-moss',
  'Social & Relationships': 'bg-rust/10 text-rust',
  Career: 'bg-[#6b5b95]/10 text-[#6b5b95]',
  Personal: 'bg-paper-dim text-ink-soft',
};

const STATUS_STYLE: Record<LifeGoalStatus, string> = {
  Active: 'bg-harbor/10 text-harbor-dark',
  Achieved: 'bg-moss text-white',
  Paused: 'bg-paper-dim text-ink-soft',
};

export default function Overview({ onManageCheckpoints }: { onManageCheckpoints: (goalId: string) => void }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [checkpoints, setCheckpoints] = useState<GoalCheckpoint[]>([]);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState<LifeGoalDomain | 'All'>('All');

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: goalData }, { data: cpData }, { data: fgData }, { data: assetData }, { data: rateData }] = await Promise.all([
      supabase.from('life_goals').select('*').eq('user_id', user!.id),
      supabase.from('goal_checkpoints').select('*').eq('user_id', user!.id),
      supabase.from('financial_goals').select('*').eq('user_id', user!.id),
      supabase.from('assets').select('*').eq('user_id', user!.id),
      supabase.from('exchange_rates').select('*').eq('user_id', user!.id),
    ]);
    setGoals(goalData ?? []);
    setCheckpoints(cpData ?? []);
    setFinancialGoals(fgData ?? []);
    setAssets(assetData ?? []);
    setRates(rateData ?? []);
    setLoading(false);
  }

  async function addGoal() {
    const { data } = await supabase
      .from('life_goals')
      .insert({
        user_id: user!.id,
        domain: 'Personal',
        dream: 'New dream',
        measurable_target: '',
        daily_system: '',
        next_checkpoint: null,
        next_checkpoint_date: null,
        progress_pct: 0,
        linked_financial_goal_id: null,
        notes: null,
        status: 'Active',
      })
      .select()
      .single();
    if (data) setGoals((prev) => [...prev, data]);
  }

  async function updateGoal(id: string, patch: Partial<LifeGoal>) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    await supabase.from('life_goals').update(patch).eq('id', id);
  }

  async function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from('life_goals').delete().eq('id', id);
  }

  const filtered = domainFilter === 'All' ? goals : goals.filter((g) => g.domain === domainFilter);

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-6 font-mono text-xs flex-wrap">
        <button
          onClick={() => setDomainFilter('All')}
          className={`px-2 py-1 rounded-sm ${domainFilter === 'All' ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'}`}
        >
          All
        </button>
        {DOMAINS.map((d) => (
          <button
            key={d}
            onClick={() => setDomainFilter(d)}
            className={`px-2 py-1 rounded-sm ${domainFilter === d ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'}`}
          >
            {d}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm text-ink-soft mb-4">No goals in this domain yet.</p>}

      <div className="space-y-4 mb-4">
        {filtered.map((goal) => {
          const { pct: progressPct, source } = computeGoalProgress(goal, checkpoints, financialGoals, assets, rates);
          const linkedFg = goal.linked_financial_goal_id
            ? financialGoals.find((fg) => fg.id === goal.linked_financial_goal_id)
            : undefined;

          return (
            <div key={goal.id} className="border border-line rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <select
                  value={goal.domain}
                  onChange={(e) => void updateGoal(goal.id, { domain: e.target.value as LifeGoalDomain })}
                  className={`px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${DOMAIN_STYLE[goal.domain]}`}
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={goal.status}
                  onChange={(e) => void updateGoal(goal.id, { status: e.target.value as LifeGoalStatus })}
                  className={`px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${STATUS_STYLE[goal.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block mb-3">
                <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Dream</span>
                <input
                  value={goal.dream}
                  onChange={(e) => void updateGoal(goal.id, { dream: e.target.value })}
                  className="w-full font-display text-lg outline-none bg-transparent focus:bg-paper-dim/40 rounded-sm px-1 -mx-1"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Measurable target</span>
                  <input
                    value={goal.measurable_target}
                    onChange={(e) => void updateGoal(goal.id, { measurable_target: e.target.value })}
                    className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
                  />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Daily system</span>
                  <input
                    value={goal.daily_system}
                    onChange={(e) => void updateGoal(goal.id, { daily_system: e.target.value })}
                    className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Next checkpoint</span>
                  <input
                    value={goal.next_checkpoint ?? ''}
                    onChange={(e) => void updateGoal(goal.id, { next_checkpoint: e.target.value || null })}
                    placeholder="10,000 DKK by Jan 2027"
                    className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
                  />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Checkpoint date</span>
                  <input
                    type="date"
                    value={goal.next_checkpoint_date ?? ''}
                    onChange={(e) => void updateGoal(goal.id, { next_checkpoint_date: e.target.value || null })}
                    className="w-full border border-line rounded-sm px-2 py-1.5 font-mono text-xs outline-none focus:border-harbor"
                  />
                </label>
              </div>

              {goal.domain === 'Financial' && source !== 'checkpoints' && (
                <label className="block mb-3">
                  <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">
                    Link progress to a financial goal (optional)
                  </span>
                  <select
                    value={goal.linked_financial_goal_id ?? ''}
                    onChange={(e) => void updateGoal(goal.id, { linked_financial_goal_id: e.target.value || null })}
                    className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
                  >
                    <option value="">Manual slider</option>
                    {financialGoals.map((fg) => (
                      <option key={fg.id} value={fg.id}>
                        {fg.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(progressPct)}
                  disabled={source !== 'manual'}
                  onChange={(e) => void updateGoal(goal.id, { progress_pct: Number(e.target.value) })}
                  className="flex-1 accent-harbor disabled:opacity-50"
                />
                <span className="font-mono text-xs text-ink-soft w-12 text-right">{Math.round(progressPct)}%</span>
              </div>

              {source === 'checkpoints' && (
                <p className="text-xs text-ink-soft mt-1">
                  From weighted checkpoints —{' '}
                  <button onClick={() => onManageCheckpoints(goal.id)} className="text-harbor hover:underline">
                    manage them
                  </button>
                </p>
              )}
              {source === 'financial' && (
                <p className="text-xs text-ink-soft mt-1">Pulled automatically from "{linkedFg?.name}" in Finance → Goals</p>
              )}
              {source === 'manual' && (
                <button onClick={() => onManageCheckpoints(goal.id)} className="text-xs text-harbor hover:underline mt-1">
                  Use weighted checkpoints instead of a manual slider →
                </button>
              )}

              <div>
                <button
                  onClick={() => void removeGoal(goal.id)}
                  className="flex items-center gap-1.5 text-ink-soft hover:text-rust text-xs mt-4"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove goal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => void addGoal()}
        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line border-dashed rounded-sm bg-white text-sm text-ink-soft hover:text-harbor hover:border-harbor w-full"
      >
        <Plus className="w-3.5 h-3.5" />
        Add goal
      </button>
    </div>
  );
}
