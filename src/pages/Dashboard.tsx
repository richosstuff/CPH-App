import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type {
  Habit,
  HabitEntry,
  WeeklyNote,
  Application,
  Contact,
  Asset,
  Liability,
  ExchangeRate,
  Transaction,
  LifeGoal,
  MonthlyFinance,
  NetWorthSnapshot,
} from '../lib/types';
import { daysUntil, daysSince, currentWeekStart, currentMonthKey, addDays, WEEKDAY_LABELS } from '../lib/dateUtils';
import { toDkk, formatDkk } from '../lib/currency';
import Sparkline from '../components/Sparkline';
import { Check, ArrowRight } from 'lucide-react';

const STALE_DAYS = 30;
const SAVINGS_GATE_MONTH = '2027-02-01';

export default function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [note, setNote] = useState<WeeklyNote | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>([]);
  const [finance, setFinance] = useState<MonthlyFinance | null>(null);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = currentWeekStart();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const weekEnd = addDays(weekStart, 6);
    const month = currentMonthKey();
    const [
      habitRes,
      entryRes,
      noteRes,
      appRes,
      contactRes,
      assetRes,
      liabRes,
      rateRes,
      txnRes,
      lifeGoalRes,
      financeRes,
    ] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user!.id).eq('is_active', true).order('position'),
      supabase.from('habit_entries').select('*').eq('user_id', user!.id).gte('entry_date', weekStart).lte('entry_date', weekEnd),
      supabase.from('weekly_notes').select('*').eq('user_id', user!.id).eq('week_start', weekStart).maybeSingle(),
      supabase.from('applications').select('*').eq('user_id', user!.id),
      supabase.from('network_contacts').select('*').eq('user_id', user!.id),
      supabase.from('assets').select('*').eq('user_id', user!.id),
      supabase.from('liabilities').select('*').eq('user_id', user!.id),
      supabase.from('exchange_rates').select('*').eq('user_id', user!.id),
      supabase.from('transactions').select('*').eq('user_id', user!.id),
      supabase.from('life_goals').select('*').eq('user_id', user!.id),
      supabase.from('monthly_finance').select('*').eq('user_id', user!.id).eq('month', month).maybeSingle(),
    ]);
    setHabits(habitRes.data ?? []);
    setEntries(entryRes.data ?? []);
    setNote(noteRes.data ?? null);
    setApplications(appRes.data ?? []);
    setContacts(contactRes.data ?? []);
    setAssets(assetRes.data ?? []);
    setLiabilities(liabRes.data ?? []);
    setRates(rateRes.data ?? []);
    setTransactions(txnRes.data ?? []);
    setLifeGoals(lifeGoalRes.data ?? []);
    setFinance(financeRes.data ?? null);

    const netWorth =
      (assetRes.data ?? []).reduce((sum, a) => sum + toDkk(a.balance, a.currency, rateRes.data ?? []), 0) -
      (liabRes.data ?? []).reduce((sum, l) => sum + toDkk(l.amount, l.currency, rateRes.data ?? []), 0);
    await supabase
      .from('net_worth_snapshots')
      .upsert({ user_id: user!.id, month, net_worth_dkk: netWorth }, { onConflict: 'user_id,month' });
    const { data: snapData } = await supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user!.id)
      .order('month', { ascending: true });
    setSnapshots((snapData ?? []).slice(-6));

    setLoading(false);
  }

  async function toggleEntry(habitId: string, date: string) {
    const existing = entries.find((e) => e.habit_id === habitId && e.entry_date === date);
    if (existing) {
      setEntries((prev) => prev.filter((e) => e.id !== existing.id));
      await supabase.from('habit_entries').delete().eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('habit_entries')
        .insert({ user_id: user!.id, habit_id: habitId, entry_date: date, completed: true })
        .select()
        .single();
      if (data) setEntries((prev) => [...prev, data]);
    }
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  const openApps = applications.filter((a) => !['Rejected', 'Offer'].includes(a.status));
  const priorities = [note?.priority_1, note?.priority_2, note?.priority_3].filter(Boolean);
  const staleContacts = contacts.filter(
    (c) => c.last_interaction_date == null || daysSince(c.last_interaction_date) >= STALE_DAYS
  );

  const netWorth =
    assets.reduce((sum, a) => sum + toDkk(a.balance, a.currency, rates), 0) -
    liabilities.reduce((sum, l) => sum + toDkk(l.amount, l.currency, rates), 0);

  const thisMonthPrefix = currentMonthKey().slice(0, 7);
  const monthTxns = transactions.filter((t) => t.date.startsWith(thisMonthPrefix));
  const monthSpend = monthTxns.filter((t) => t.type === 'Expense').reduce((sum, t) => sum + t.amount_dkk, 0);
  const monthIncomeFromTxns = monthTxns.filter((t) => t.type === 'Income').reduce((sum, t) => sum + t.amount_dkk, 0);
  const planIncome = finance?.actual_net_income_dkk ?? null;
  const income = planIncome ?? (monthIncomeFromTxns > 0 ? monthIncomeFromTxns : null);
  const cashFlow = income != null ? income - monthSpend : null;

  const savings = finance?.savings_dkk ?? null;
  const savingsRate = income && savings != null && income > 0 ? Math.round((savings / income) * 100) : null;
  const gated = currentMonthKey() >= SAVINGS_GATE_MONTH;
  const belowTarget = gated && savingsRate != null && savingsRate < 40;

  const activeLifeGoals = lifeGoals.filter((g) => g.status === 'Active');
  const habitRate = habits.length > 0 ? Math.round((entries.length / (habits.length * 7)) * 100) : null;

  const upcomingCheckpoints = lifeGoals.filter(
    (g) =>
      g.status === 'Active' &&
      g.next_checkpoint_date &&
      daysUntil(g.next_checkpoint_date) >= 0 &&
      daysUntil(g.next_checkpoint_date) <= 30
  );

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 className="font-display text-3xl mb-6">Copenhagen Chapter</h1>

      {staleContacts.length > 0 && (
        <Link
          to="/network"
          className="flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-sm bg-rust/10 text-rust text-sm hover:bg-rust/15 transition-colors"
        >
          <span>
            <strong className="font-medium">{staleContacts.length}</strong> stale contact
            {staleContacts.length === 1 ? '' : 's'} — no interaction logged in {STALE_DAYS}+ days
          </span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      )}

      {upcomingCheckpoints.length > 0 && (
        <Link
          to="/goals"
          className="flex items-center justify-between gap-3 mb-6 px-4 py-2.5 rounded-sm bg-harbor/10 text-harbor-dark text-sm hover:bg-harbor/15 transition-colors"
        >
          <span>
            <strong className="font-medium">{upcomingCheckpoints.length}</strong> goal checkpoint
            {upcomingCheckpoints.length === 1 ? '' : 's'} due within 30 days
          </span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft">Life KPIs</h2>
        <Link to="/finance" className="text-xs text-harbor hover:underline">
          Open Finance
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-line rounded-sm bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Net worth</p>
          <p className="font-display text-2xl">
            {formatDkk(netWorth)} <span className="text-xs font-body text-ink-soft">DKK</span>
          </p>
          <div className="mt-1">
            <Sparkline data={snapshots.map((s) => s.net_worth_dkk)} />
          </div>
        </div>
        <div className="border border-line rounded-sm bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Savings rate</p>
          <p className={`font-display text-2xl ${belowTarget ? 'text-rust' : ''}`}>
            {savingsRate != null ? `${savingsRate}%` : '—'}
          </p>
          {belowTarget && <p className="text-[10px] text-rust mt-1">Below the 40% target</p>}
        </div>
        <div className="border border-line rounded-sm bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">This month's cash flow</p>
          <p className={`font-display text-2xl ${cashFlow != null && cashFlow < 0 ? 'text-rust' : ''}`}>
            {cashFlow != null ? `${cashFlow >= 0 ? '+' : ''}${formatDkk(cashFlow)}` : '—'}
          </p>
        </div>
        <div className="border border-line rounded-sm bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Open applications</p>
          <p className="font-display text-2xl">{openApps.length}</p>
        </div>
        <div className="border border-line rounded-sm bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Active goals</p>
          <p className="font-display text-2xl">{activeLifeGoals.length}</p>
        </div>
        <div className="border border-line rounded-sm bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">This week's habits</p>
          <p className="font-display text-2xl">{habitRate != null ? `${habitRate}%` : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-line rounded-sm bg-white p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft">This week</h2>
            <Link to="/habits" className="text-xs text-harbor hover:underline">
              Open weekly log
            </Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-ink-soft">No habits yet — add some from the Habits tab.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-normal text-ink-soft"></th>
                  {days.map((d, i) => (
                    <th key={d} className="font-mono text-[10px] font-normal text-ink-soft text-center">
                      {WEEKDAY_LABELS[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => (
                  <tr key={habit.id}>
                    <td className="py-1 pr-2 text-xs">{habit.name}</td>
                    {days.map((date) => {
                      const done = entries.some((e) => e.habit_id === habit.id && e.entry_date === date);
                      return (
                        <td key={date} className="text-center py-1">
                          <button
                            onClick={() => void toggleEntry(habit.id, date)}
                            className={`w-5 h-5 rounded-sm border inline-flex items-center justify-center ${
                              done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                            }`}
                          >
                            {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-line rounded-sm bg-white p-5">
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Top 3 this week</h2>
          {priorities.length ? (
            <ol className="space-y-2 text-sm list-decimal list-inside">
              {priorities.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-soft">
              Not set yet — add them from the{' '}
              <Link to="/habits" className="text-harbor hover:underline">
                Habits
              </Link>{' '}
              tab.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
