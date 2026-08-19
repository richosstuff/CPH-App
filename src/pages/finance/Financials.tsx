import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Transaction, TransactionType, ExchangeRate, Currency } from '../../lib/types';
import { todayISO, currentMonthKey } from '../../lib/dateUtils';
import { toDkk, formatDkk } from '../../lib/currency';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS, INCOME_CATEGORIES, INCOME_CATEGORY_COLORS } from '../../lib/transactionCategories';
import { Plus, Trash2 } from 'lucide-react';

const CURRENCIES: Currency[] = ['DKK', 'EUR', 'GBP', 'USD', 'SEK'];
const TYPES: TransactionType[] = ['Expense', 'Income'];

function formatMonthLabel(yyyyMM: string): string {
  return new Date(yyyyMM + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function categoryColor(type: TransactionType, category: string): string {
  const map: Record<string, string> = type === 'Expense' ? CATEGORY_COLORS : INCOME_CATEGORY_COLORS;
  return map[category] ?? '#9aa39e';
}

function last6MonthKeys(): string[] {
  const keys: string[] = [];
  const base = new Date();
  base.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export default function Financials() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>(currentMonthKey().slice(0, 7));
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'All'>('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: txnData }, { data: rateData }] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user!.id),
      supabase.from('exchange_rates').select('*').eq('user_id', user!.id),
    ]);
    setTransactions(txnData ?? []);
    setRates(rateData ?? []);
    setLoading(false);
  }

  async function updateRate(currency: Currency, rate_to_dkk: number) {
    const existing = rates.find((r) => r.currency === currency);
    setRates((prev) => (existing ? prev.map((r) => (r.currency === currency ? { ...r, rate_to_dkk } : r)) : prev));
    if (existing) {
      await supabase.from('exchange_rates').update({ rate_to_dkk }).eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('exchange_rates')
        .insert({ user_id: user!.id, currency, rate_to_dkk })
        .select()
        .single();
      if (data) setRates((prev) => [...prev, data]);
    }
  }

  async function addTransaction() {
    const { data } = await supabase
      .from('transactions')
      .insert({
        user_id: user!.id,
        date: todayISO(),
        type: 'Expense',
        description: 'New transaction',
        amount: 0,
        currency: 'DKK',
        amount_dkk: 0,
        category: 'Other',
        label: null,
      })
      .select()
      .single();
    if (data) setTransactions((prev) => [data, ...prev]);
  }

  async function updateTransaction(id: string, patch: Partial<Transaction>) {
    const current = transactions.find((t) => t.id === id);
    if (!current) return;
    let category = patch.category ?? current.category;
    if (patch.type && patch.type !== current.type) {
      const validCategories: string[] = patch.type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      if (!validCategories.includes(category)) category = 'Other';
    }
    const merged = { ...current, ...patch, category };
    const fullPatch = { ...patch, category, amount_dkk: toDkk(merged.amount, merged.currency, rates) };
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...fullPatch } : t)));
    await supabase.from('transactions').update(fullPatch).eq('id', id);
  }

  async function removeTransaction(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  const filtered = transactions.filter((t) => {
    if (monthFilter !== 'All' && !t.date.startsWith(monthFilter)) return false;
    if (typeFilter !== 'All' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (currencyFilter !== 'All' && t.currency !== currencyFilter) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'date' ? b.date.localeCompare(a.date) : b.amount_dkk - a.amount_dkk
  );
  const incomeTotal = filtered.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount_dkk, 0);
  const expenseTotal = filtered.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount_dkk, 0);
  const months = Array.from(new Set(transactions.map((t) => t.date.slice(0, 7)))).sort().reverse();
  const allCategories = Array.from(new Set(transactions.map((t) => t.category))).sort();

  const thisMonthKey = currentMonthKey().slice(0, 7);
  const thisMonthExpenses = transactions.filter((t) => t.type === 'Expense' && t.date.startsWith(thisMonthKey));
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: thisMonthExpenses.filter((t) => t.category === cat).reduce((s, t) => s + t.amount_dkk, 0),
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const monthlyTrend = last6MonthKeys().map((m) => {
    const monthTxns = transactions.filter((t) => t.date.startsWith(m));
    return {
      month: formatMonthLabel(m),
      Income: monthTxns.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount_dkk, 0),
      Expense: monthTxns.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount_dkk, 0),
    };
  });

  const daysInThisMonth = new Date(
    Number(thisMonthKey.slice(0, 4)),
    Number(thisMonthKey.slice(5, 7)),
    0
  ).getDate();
  const byDay: Record<number, number> = {};
  for (const t of transactions.filter((t) => t.date.startsWith(thisMonthKey))) {
    const day = Number(t.date.slice(8, 10));
    byDay[day] = (byDay[day] ?? 0) + (t.type === 'Income' ? t.amount_dkk : -t.amount_dkk);
  }
  let running = 0;
  const cumulative = Array.from({ length: daysInThisMonth }, (_, i) => {
    const day = i + 1;
    running += byDay[day] ?? 0;
    return { day, net: running };
  });

  return (
    <div>
      <div className="border border-line rounded-sm bg-white p-4 mb-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Exchange rates → DKK</p>
        <div className="flex flex-wrap gap-4">
          {CURRENCIES.filter((c) => c !== 'DKK').map((c) => {
            const rate = rates.find((r) => r.currency === c);
            return (
              <label key={c} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-ink-soft w-10">{c}</span>
                <input
                  type="number"
                  step="0.01"
                  value={rate?.rate_to_dkk ?? ''}
                  onChange={(e) => void updateRate(c, Number(e.target.value) || 0)}
                  className="w-20 border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-line rounded-sm bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Spending by category — this month</p>
          {byCategory.length === 0 ? (
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
          )}
        </div>

        <div className="border border-line rounded-sm bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Income vs expense — 6 months</p>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#d8dcda" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: 'ui-monospace' }} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'ui-monospace' }} />
                <Tooltip contentStyle={{ fontFamily: 'ui-monospace', fontSize: 12, borderRadius: 2 }} />
                <Bar dataKey="Income" fill="#5f8863" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Expense" fill="#b4622e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-line rounded-sm bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Cumulative net — this month</p>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulative} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#d8dcda" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fontFamily: 'ui-monospace' }} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'ui-monospace' }} />
                <Tooltip contentStyle={{ fontFamily: 'ui-monospace', fontSize: 12, borderRadius: 2 }} />
                <Line type="monotone" dataKey="net" stroke="#822200" strokeWidth={1.75} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="border border-line rounded-sm px-2 py-1 bg-white outline-none focus:border-harbor">
            <option value="All">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'All')} className="border border-line rounded-sm px-2 py-1 bg-white outline-none focus:border-harbor">
            <option value="All">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-line rounded-sm px-2 py-1 bg-white outline-none focus:border-harbor">
            <option value="All">All categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value as Currency | 'All')} className="border border-line rounded-sm px-2 py-1 bg-white outline-none focus:border-harbor">
            <option value="All">All currencies</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-ink-soft">Sort</span>
          {(['date', 'amount'] as const).map((k) => (
            <button key={k} onClick={() => setSortBy(k)} className={`px-2 py-1 rounded-sm ${sortBy === k ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'}`}>
              {k === 'date' ? 'Date' : 'Amount'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-sm bg-moss/10 text-moss">+{formatDkk(incomeTotal)}</span>
          <span className="px-3 py-1.5 rounded-sm bg-rust/10 text-rust">-{formatDkk(expenseTotal)}</span>
          <span className="px-3 py-1.5 rounded-sm bg-paper-dim/50">Net: <strong>{formatDkk(incomeTotal - expenseTotal)} DKK</strong></span>
        </div>
      </div>

      <div className="border border-line rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-dim/50 text-left">
              <th className="font-medium px-4 py-2 w-32">Date</th>
              <th className="font-medium px-4 py-2 w-24">Type</th>
              <th className="font-medium px-4 py-2">Description</th>
              <th className="font-medium px-4 py-2 w-24">Amount</th>
              <th className="font-medium px-4 py-2 w-20">Currency</th>
              <th className="font-medium px-4 py-2 w-24">DKK</th>
              <th className="font-medium px-4 py-2 w-44">Category</th>
              <th className="font-medium px-4 py-2 w-32">Label</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 group">
                <td className="px-2 py-1.5">
                  <input type="date" value={t.date} onChange={(e) => void updateTransaction(t.id, { date: e.target.value })} className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs" />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={t.type}
                    onChange={(e) => void updateTransaction(t.id, { type: e.target.value as TransactionType })}
                    className={`w-full px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${t.type === 'Income' ? 'bg-moss/10 text-moss' : 'bg-rust/10 text-rust'}`}
                  >
                    {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={t.description} onChange={(e) => void updateTransaction(t.id, { description: e.target.value })} className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" value={t.amount} onChange={(e) => void updateTransaction(t.id, { amount: Number(e.target.value) || 0 })} className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs" />
                </td>
                <td className="px-2 py-1.5">
                  <select value={t.currency} onChange={(e) => void updateTransaction(t.id, { currency: e.target.value as Currency })} className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-4 py-1.5 font-mono text-xs text-ink-soft">{formatDkk(t.amount_dkk)}</td>
                <td className="px-2 py-1.5">
                  <select
                    value={t.category}
                    onChange={(e) => void updateTransaction(t.id, { category: e.target.value })}
                    className="w-full px-2 py-1 rounded-sm text-xs font-medium outline-none border-0"
                    style={{ backgroundColor: `${categoryColor(t.type, t.category)}1a`, color: categoryColor(t.type, t.category) }}
                  >
                    {(t.type === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={t.label ?? ''} onChange={(e) => void updateTransaction(t.id, { label: e.target.value || null })} placeholder="optional tag" className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 text-xs" />
                </td>
                <td>
                  <button onClick={() => void removeTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1.5" aria-label={`Remove ${t.description}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <button onClick={() => void addTransaction()} className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full">
          <Plus className="w-3.5 h-3.5" />
          Add transaction
        </button>
      </div>
    </div>
  );
}
