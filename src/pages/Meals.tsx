import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { MealWeek, MealDay, ShoppingListItem } from '../lib/types';
import { currentWeekStart, formatShortDate, addDays } from '../lib/dateUtils';
import { Plus, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyWeek = (weekStart: string): MealWeek => ({
  id: '',
  user_id: '',
  week_start: weekStart,
  notes: '',
  budget_dkk: null,
});

export default function Meals() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const [week, setWeek] = useState<MealWeek>(emptyWeek(currentWeekStart()));
  const [budgetInput, setBudgetInput] = useState('');
  const [days, setDays] = useState<MealDay[]>([]);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, weekStart]);

  async function load() {
    setLoading(true);
    const [{ data: weekData }, { data: dayData }, { data: itemData }] = await Promise.all([
      supabase.from('meal_weeks').select('*').eq('user_id', user!.id).eq('week_start', weekStart).maybeSingle(),
      supabase.from('meal_days').select('*').eq('user_id', user!.id).eq('week_start', weekStart).order('day_of_week'),
      supabase.from('shopping_list_items').select('*').eq('user_id', user!.id).eq('week_start', weekStart),
    ]);

    const loadedWeek = weekData ?? emptyWeek(weekStart);
    setWeek(loadedWeek);
    setBudgetInput(loadedWeek.budget_dkk != null ? String(loadedWeek.budget_dkk) : '');

    let dayRows = dayData ?? [];
    const missing = [0, 1, 2, 3, 4, 5, 6].filter((d) => !dayRows.some((row) => row.day_of_week === d));
    if (missing.length) {
      const { data: created } = await supabase
        .from('meal_days')
        .insert(missing.map((day_of_week) => ({ user_id: user!.id, week_start: weekStart, day_of_week })))
        .select();
      dayRows = [...dayRows, ...(created ?? [])].sort((a, b) => a.day_of_week - b.day_of_week);
    }
    setDays(dayRows);
    setItems(itemData ?? []);
    setLoading(false);
  }

  async function saveWeek(patch: Partial<MealWeek>) {
    const updated = { ...week, ...patch };
    setWeek(updated);
    const { data } = await supabase
      .from('meal_weeks')
      .upsert(
        {
          user_id: user!.id,
          week_start: weekStart,
          notes: updated.notes,
          budget_dkk: updated.budget_dkk,
          id: week.id || undefined,
        },
        { onConflict: 'user_id,week_start' }
      )
      .select()
      .single();
    if (data) setWeek(data);
  }

  async function updateDay(id: string, patch: Partial<MealDay>) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    await supabase.from('meal_days').update(patch).eq('id', id);
  }

  async function addItem() {
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({ user_id: user!.id, week_start: weekStart, item: 'New item' })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data]);
  }

  async function updateItem(id: string, patch: Partial<ShoppingListItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from('shopping_list_items').update(patch).eq('id', id);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('shopping_list_items').delete().eq('id', id);
  }

  const total = items.reduce((sum, i) => sum + (i.estimated_price_dkk ?? 0), 0);
  const overBudget = week.budget_dkk != null && total > week.budget_dkk;

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Meals</h1>
        <div className="flex items-center gap-1 font-mono text-sm">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-1.5 hover:bg-paper-dim rounded-sm"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-ink-soft px-1">
            {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-1.5 hover:bg-paper-dim rounded-sm"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-ink-soft mb-6 text-sm">Plan in Goma (or wherever) — this just logs what you decided.</p>

      <textarea
        value={week.notes}
        onChange={(e) => setWeek({ ...week, notes: e.target.value })}
        onBlur={(e) => void saveWeek({ notes: e.target.value })}
        rows={2}
        placeholder="Notes for the week — using up the freezer, exam week so keep it light…"
        className="w-full border border-line rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-harbor resize-none mb-6"
      />

      <div className="border border-line rounded-sm overflow-hidden bg-white mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-dim/50 text-left">
              <th className="font-medium px-4 py-2 w-28">Day</th>
              <th className="font-medium px-4 py-2">Dinner</th>
              <th className="font-medium px-4 py-2 w-16 text-center">Batch</th>
              <th className="font-medium px-4 py-2 w-16 text-center">Leftovers</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-medium">{DAY_NAMES[day.day_of_week]}</td>
                <td className="px-2 py-1.5">
                  <input
                    value={day.dinner}
                    onChange={(e) => updateDay(day.id, { dinner: e.target.value })}
                    placeholder="What's for dinner?"
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                  />
                </td>
                <td className="text-center">
                  <button
                    onClick={() => void updateDay(day.id, { is_batch_cooked: !day.is_batch_cooked })}
                    className={`w-6 h-6 rounded-sm border inline-flex items-center justify-center transition-colors ${
                      day.is_batch_cooked ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                    }`}
                    aria-label={`Batch cooked on ${DAY_NAMES[day.day_of_week]}`}
                  >
                    {day.is_batch_cooked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </button>
                </td>
                <td className="text-center">
                  <button
                    onClick={() => void updateDay(day.id, { is_leftovers: !day.is_leftovers })}
                    className={`w-6 h-6 rounded-sm border inline-flex items-center justify-center transition-colors ${
                      day.is_leftovers ? 'bg-harbor border-harbor' : 'border-line hover:border-harbor'
                    }`}
                    aria-label={`Leftovers on ${DAY_NAMES[day.day_of_week]}`}
                  >
                    {day.is_leftovers && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft">Shopping list</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            onBlur={() => void saveWeek({ budget_dkk: budgetInput ? Number(budgetInput) : null })}
            placeholder="budget DKK"
            className="w-24 border border-line rounded-sm px-2 py-1 text-xs font-mono outline-none focus:border-harbor"
          />
          <span
            className={`font-mono text-xs px-2 py-1 rounded-sm ${overBudget ? 'bg-rust/10 text-rust' : 'bg-moss/10 text-moss'}`}
          >
            Total: {total.toLocaleString()} DKK
          </span>
        </div>
      </div>

      <div className="border border-line rounded-sm overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-dim/50 text-left">
              <th className="font-medium px-4 py-2">Item</th>
              <th className="font-medium px-4 py-2 w-24">Qty</th>
              <th className="font-medium px-4 py-2 w-28">Price (DKK)</th>
              <th className="font-medium px-4 py-2 w-28">Store</th>
              <th className="font-medium px-4 py-2">Notes</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0 group">
                <td className="px-2 py-1.5">
                  <input
                    value={item.item}
                    onChange={(e) => updateItem(item.id, { item: e.target.value })}
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={item.quantity ?? ''}
                    onChange={(e) => updateItem(item.id, { quantity: e.target.value || null })}
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={item.estimated_price_dkk ?? ''}
                    onChange={(e) =>
                      updateItem(item.id, { estimated_price_dkk: e.target.value ? Number(e.target.value) : null })
                    }
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={item.supermarket ?? ''}
                    onChange={(e) => updateItem(item.id, { supermarket: e.target.value || null })}
                    placeholder="Netto, Rema…"
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={item.notes ?? ''}
                    onChange={(e) => updateItem(item.id, { notes: e.target.value || null })}
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                  />
                </td>
                <td>
                  <button
                    onClick={() => void removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1.5"
                    aria-label={`Remove ${item.item}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => void addItem()}
          className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Add item
        </button>
      </div>
    </div>
  );
}
