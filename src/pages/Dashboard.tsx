import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  Todo,
  Note,
  CalendarCategory,
  CalendarDay,
  UserSettings,
  DashboardWidgetId,
} from '../lib/types';
import { DASHBOARD_WIDGET_IDS } from '../lib/types';
import {
  daysUntil,
  daysSince,
  currentWeekStart,
  currentMonthKey,
  addDays,
  WEEKDAY_LABELS,
  toLocalISO,
  monthGridDays,
} from '../lib/dateUtils';
import { toDkk, formatDkk } from '../lib/currency';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../lib/transactionCategories';
import { reorder } from '../lib/dragReorder';
import Sparkline from '../components/Sparkline';
import { Check, ArrowRight, GripVertical, Plus, Trash2 } from 'lucide-react';

const STALE_DAYS = 30;
const SAVINGS_GATE_MONTH = '2027-02-01';
const NOTE_TINTS = ['#2d6e7e', '#5f8863', '#b4622e', '#6b5b95'];

function WidgetCard({
  title,
  index,
  dragIndex,
  onDragStart,
  onDrop,
  onDragEnd,
  right,
  children,
}: {
  title: string;
  index: number;
  dragIndex: number | null;
  onDragStart: (i: number) => void;
  onDrop: (i: number) => void;
  onDragEnd: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(index)}
      className={`border border-line rounded-sm bg-white p-5 mb-4 transition-opacity ${dragIndex === index ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            draggable
            onDragStart={() => onDragStart(index)}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing text-ink-soft/40 hover:text-ink-soft"
          >
            <GripVertical className="w-4 h-4" />
          </span>
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [calCategories, setCalCategories] = useState<CalendarCategory[]>([]);
  const [calDays, setCalDays] = useState<CalendarDay[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickTodoText, setQuickTodoText] = useState('');
  const [widgetDragIndex, setWidgetDragIndex] = useState<number | null>(null);
  const [noteDragIndex, setNoteDragIndex] = useState<number | null>(null);

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
      todoRes,
      noteRowRes,
      calCatRes,
      calDayRes,
      settingsRes,
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
      supabase.from('todos').select('*').eq('user_id', user!.id).order('position'),
      supabase.from('notes').select('*').eq('user_id', user!.id).order('position'),
      supabase.from('calendar_categories').select('*').eq('user_id', user!.id),
      supabase.from('calendar_days').select('*').eq('user_id', user!.id),
      supabase.from('user_settings').select('*').eq('user_id', user!.id).maybeSingle(),
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
    setTodos(todoRes.data ?? []);
    setNotes(noteRowRes.data ?? []);
    setCalCategories(calCatRes.data ?? []);
    setCalDays(calDayRes.data ?? []);
    setSettings(settingsRes.data ?? null);

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

  async function toggleTodo(id: string, is_done: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, is_done } : t)));
    await supabase.from('todos').update({ is_done }).eq('id', id);
  }

  async function quickAddTodo() {
    if (!quickTodoText.trim()) return;
    const { data } = await supabase
      .from('todos')
      .insert({ user_id: user!.id, text: quickTodoText.trim(), is_done: false, position: todos.length })
      .select()
      .single();
    if (data) setTodos((prev) => [...prev, data]);
    setQuickTodoText('');
  }

  async function addNote() {
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: user!.id, text: '', position: notes.length })
      .select()
      .single();
    if (data) setNotes((prev) => [...prev, data]);
  }

  async function updateNote(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    await supabase.from('notes').update({ text }).eq('id', id);
  }

  async function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notes').delete().eq('id', id);
  }

  async function persistNoteOrder(newList: Note[]) {
    setNotes(newList);
    await Promise.all(newList.map((n, i) => supabase.from('notes').update({ position: i }).eq('id', n.id)));
  }

  function handleNoteDrop(index: number) {
    if (noteDragIndex === null || noteDragIndex === index) {
      setNoteDragIndex(null);
      return;
    }
    void persistNoteOrder(reorder(notes, noteDragIndex, index));
    setNoteDragIndex(null);
  }

  async function persistWidgetOrder(newOrder: DashboardWidgetId[]) {
    setSettings((prev) => (prev ? { ...prev, dashboard_widget_order: newOrder } : prev));
    await supabase.from('user_settings').upsert(
      {
        user_id: user!.id,
        accent_color: settings?.accent_color ?? null,
        avatar_data_url: settings?.avatar_data_url ?? null,
        nav_order: settings?.nav_order ?? null,
        dashboard_widget_order: newOrder,
        dashboard_widget_visibility: settings?.dashboard_widget_visibility ?? null,
        id: settings?.id || undefined,
      },
      { onConflict: 'user_id' }
    );
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

  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: monthTxns.filter((t) => t.type === 'Expense' && t.category === cat).reduce((s, t) => s + t.amount_dkk, 0),
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const netWorthSeries = snapshots.map((s) => ({
    month: new Date(s.month + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }),
    value: s.net_worth_dkk,
  }));

  const now = new Date();
  const miniCalDays = monthGridDays(now.getFullYear(), now.getMonth());
  const calDaysByDate = new Map(calDays.map((d) => [d.date, d]));

  const defaultOrder: DashboardWidgetId[] = [...DASHBOARD_WIDGET_IDS];
  const storedOrder = settings?.dashboard_widget_order ?? defaultOrder;
  const fullOrder = [...storedOrder, ...defaultOrder.filter((id) => !storedOrder.includes(id))];
  const visibleOrder = fullOrder.filter((id) => settings?.dashboard_widget_visibility?.[id] !== false);

  function handleWidgetDrop(index: number) {
    if (widgetDragIndex === null || widgetDragIndex === index) {
      setWidgetDragIndex(null);
      return;
    }
    const reorderedVisible = reorder(visibleOrder, widgetDragIndex, index);
    const hidden = fullOrder.filter((id) => !visibleOrder.includes(id));
    void persistWidgetOrder([...reorderedVisible, ...hidden]);
    setWidgetDragIndex(null);
  }

  const widgetTitles: Record<DashboardWidgetId, string> = {
    kpis: 'Life KPIs',
    'this-week': 'This week',
    priorities: 'Top 3 this week',
    todos: 'To-Do',
    calendar: 'Calendar',
    notes: 'Notes',
    'net-worth-trend': 'Net worth trend',
    'spending-breakdown': 'Spending breakdown',
  };

  function widgetBody(id: DashboardWidgetId): ReactNode {
    switch (id) {
      case 'kpis':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Net worth</p>
              <p className="font-display text-2xl">
                {formatDkk(netWorth)} <span className="text-xs font-body text-ink-soft">DKK</span>
              </p>
              <div className="mt-1">
                <Sparkline data={snapshots.map((s) => s.net_worth_dkk)} />
              </div>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Savings rate</p>
              <p className={`font-display text-2xl ${belowTarget ? 'text-rust' : ''}`}>
                {savingsRate != null ? `${savingsRate}%` : '—'}
              </p>
              {belowTarget && <p className="text-[10px] text-rust mt-1">Below the 40% target</p>}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">This month's cash flow</p>
              <p className={`font-display text-2xl ${cashFlow != null && cashFlow < 0 ? 'text-rust' : ''}`}>
                {cashFlow != null ? `${cashFlow >= 0 ? '+' : ''}${formatDkk(cashFlow)}` : '—'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Open applications</p>
              <p className="font-display text-2xl">{openApps.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">Active goals</p>
              <p className="font-display text-2xl">{activeLifeGoals.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">This week's habits</p>
              <p className="font-display text-2xl">{habitRate != null ? `${habitRate}%` : '—'}</p>
            </div>
          </div>
        );

      case 'this-week':
        return habits.length === 0 ? (
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
        );

      case 'priorities':
        return priorities.length ? (
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
        );

      case 'todos': {
        const shown = todos.slice(0, 6);
        return (
          <div>
            {shown.length === 0 && <p className="text-sm text-ink-soft mb-2">Nothing on the list.</p>}
            <div className="space-y-1.5 mb-2">
              {shown.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => void toggleTodo(t.id, !t.is_done)}
                    className={`w-4 h-4 rounded-sm border shrink-0 inline-flex items-center justify-center ${
                      t.is_done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                    }`}
                  >
                    {t.is_done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>
                  <span className={`text-sm truncate ${t.is_done ? 'line-through text-ink-soft' : ''}`}>{t.text}</span>
                </div>
              ))}
            </div>
            {todos.length > 6 && (
              <Link to="/todos" className="text-xs text-harbor hover:underline">
                +{todos.length - 6} more
              </Link>
            )}
            <input
              value={quickTodoText}
              onChange={(e) => setQuickTodoText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void quickAddTodo()}
              placeholder="Quick add…"
              className="w-full border border-line rounded-sm px-2 py-1 text-xs outline-none focus:border-harbor mt-2"
            />
          </div>
        );
      }

      case 'calendar':
        return (
          <Link to="/calendar" className="block">
            <div className="grid grid-cols-7 gap-0.5">
              {miniCalDays.map((d) => {
                const iso = toLocalISO(d);
                const inMonth = d.getMonth() === now.getMonth();
                const entry = calDaysByDate.get(iso);
                const category = entry?.category_id ? calCategories.find((c) => c.id === entry.category_id) : undefined;
                const isToday = iso === toLocalISO(now);
                return (
                  <div
                    key={iso}
                    className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono ${
                      inMonth ? 'text-ink-soft' : 'text-ink-soft/30'
                    } ${isToday ? 'ring-1 ring-harbor' : ''}`}
                    style={{ backgroundColor: category ? category.color : undefined, color: category ? '#fff' : undefined }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </Link>
        );

      case 'notes':
        return (
          <div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {notes.map((n, i) => (
                <div
                  key={n.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleNoteDrop(i)}
                  className={`rounded-sm p-2 group relative ${noteDragIndex === i ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: `${NOTE_TINTS[i % NOTE_TINTS.length]}14` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      draggable
                      onDragStart={() => setNoteDragIndex(i)}
                      onDragEnd={() => setNoteDragIndex(null)}
                      className="cursor-grab text-ink-soft/40 hover:text-ink-soft"
                    >
                      <GripVertical className="w-3 h-3" />
                    </span>
                    <button
                      onClick={() => void removeNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust"
                      aria-label="Remove note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    defaultValue={n.text}
                    onBlur={(e) => void updateNote(n.id, e.target.value)}
                    rows={3}
                    placeholder="Note…"
                    className="w-full bg-transparent outline-none text-xs resize-none"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => void addNote()}
              className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-harbor"
            >
              <Plus className="w-3 h-3" />
              Add note
            </button>
          </div>
        );

      case 'net-worth-trend':
        return netWorthSeries.length < 2 ? (
          <p className="text-sm text-ink-soft">Not enough history yet — check back after a couple of months.</p>
        ) : (
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#d8dcda" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: 'ui-monospace' }} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'ui-monospace' }} />
                <Tooltip contentStyle={{ fontFamily: 'ui-monospace', fontSize: 12, borderRadius: 2 }} />
                <Area type="monotone" dataKey="value" stroke="#2d6e7e" fill="#2d6e7e" fillOpacity={0.15} strokeWidth={1.75} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'spending-breakdown':
        return byCategory.length === 0 ? (
          <p className="text-sm text-ink-soft">No expenses logged yet this month.</p>
        ) : (
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={38} outerRadius={65} paddingAngle={2}>
                  {byCategory.map((c) => (
                    <Cell key={c.name} fill={CATEGORY_COLORS[c.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'ui-monospace', fontSize: 12, borderRadius: 2 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
    }
  }

  const widgetRight: Partial<Record<DashboardWidgetId, ReactNode>> = {
    kpis: (
      <Link to="/finance" className="text-xs text-harbor hover:underline">
        Open Finance
      </Link>
    ),
    'this-week': (
      <Link to="/habits" className="text-xs text-harbor hover:underline">
        Open weekly log
      </Link>
    ),
    todos: (
      <Link to="/todos" className="text-xs text-harbor hover:underline">
        Full list
      </Link>
    ),
    calendar: (
      <Link to="/calendar" className="text-xs text-harbor hover:underline">
        Open Calendar
      </Link>
    ),
  };

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
        <p className="text-xs text-ink-soft">Drag any card's handle to reorder. Hide widgets from Settings.</p>
        <Link to="/settings" className="text-xs text-harbor hover:underline">
          Customize
        </Link>
      </div>

      {visibleOrder.map((id, i) => (
        <WidgetCard
          key={id}
          title={widgetTitles[id]}
          index={i}
          dragIndex={widgetDragIndex}
          onDragStart={setWidgetDragIndex}
          onDrop={handleWidgetDrop}
          onDragEnd={() => setWidgetDragIndex(null)}
          right={widgetRight[id]}
        >
          {widgetBody(id)}
        </WidgetCard>
      ))}
    </div>
  );
}
