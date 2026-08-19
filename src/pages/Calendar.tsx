import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { CalendarCategory, CalendarDay } from '../lib/types';
import { WEEKDAY_LABELS, toLocalISO, monthGridDays } from '../lib/dateUtils';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

const CLEAR = '__clear__';

export default function CalendarPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2d6e7e');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: catData }, { data: dayData }] = await Promise.all([
      supabase.from('calendar_categories').select('*').eq('user_id', user!.id),
      supabase.from('calendar_days').select('*').eq('user_id', user!.id),
    ]);
    setCategories(catData ?? []);
    setDays(dayData ?? []);
    setLoading(false);
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const { data } = await supabase
      .from('calendar_categories')
      .insert({ user_id: user!.id, name: newCatName.trim(), color: newCatColor })
      .select()
      .single();
    if (data) {
      setCategories((prev) => [...prev, data]);
      setNewCatName('');
    }
  }

  async function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDays((prev) => prev.map((d) => (d.category_id === id ? { ...d, category_id: null } : d)));
    await supabase.from('calendar_categories').delete().eq('id', id);
  }

  async function upsertDay(iso: string, patch: { category_id?: string | null; label?: string | null }) {
    const existing = days.find((d) => d.date === iso);
    const merged = {
      category_id: existing?.category_id ?? null,
      label: existing?.label ?? null,
      ...patch,
    };
    if (!merged.category_id && !merged.label) {
      if (existing) {
        setDays((prev) => prev.filter((d) => d.id !== existing.id));
        await supabase.from('calendar_days').delete().eq('id', existing.id);
      }
      return;
    }
    if (existing) {
      setDays((prev) => prev.map((d) => (d.id === existing.id ? { ...d, ...merged } : d)));
      await supabase.from('calendar_days').update(merged).eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('calendar_days')
        .insert({ user_id: user!.id, date: iso, ...merged })
        .select()
        .single();
      if (data) setDays((prev) => [...prev, data]);
    }
  }

  function handleDrop(iso: string) {
    if (!dragCategoryId) return;
    void upsertDay(iso, { category_id: dragCategoryId === CLEAR ? null : dragCategoryId });
    setDragCategoryId(null);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  const gridDays = monthGridDays(year, month);
  const daysByDate = new Map(days.map((d) => [d.date, d]));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Calendar</h1>
        <div className="flex items-center gap-1 font-mono text-sm">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-paper-dim rounded-sm" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-ink-soft px-1 w-32 text-center">
            {viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-paper-dim rounded-sm" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-ink-soft mb-4 text-sm">Drag a category onto a day to color it. Type directly on a day to label it.</p>

      <div className="border border-line rounded-sm bg-white p-4 mb-4">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-2">Categories — drag onto a day</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {categories.map((c) => (
            <span
              key={c.id}
              draggable
              onDragStart={() => setDragCategoryId(c.id)}
              onDragEnd={() => setDragCategoryId(null)}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-sm text-xs font-medium text-white cursor-grab active:cursor-grabbing"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
              <button onClick={() => void removeCategory(c.id)} className="hover:opacity-70" aria-label={`Delete ${c.name}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <span
            draggable
            onDragStart={() => setDragCategoryId(CLEAR)}
            onDragEnd={() => setDragCategoryId(null)}
            className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs border border-dashed border-line text-ink-soft cursor-grab active:cursor-grabbing"
          >
            Clear
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            className="w-8 h-8 rounded-sm border border-line cursor-pointer bg-transparent p-0.5"
          />
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addCategory()}
            placeholder="New category name"
            className="flex-1 max-w-xs border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
          />
          <button
            onClick={() => void addCategory()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-harbor border border-harbor hover:bg-harbor/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      <div className="border border-line rounded-sm bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-paper-dim/50">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="font-mono text-[10px] uppercase tracking-wide text-ink-soft text-center py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((d) => {
            const iso = toLocalISO(d);
            const inMonth = d.getMonth() === month;
            const entry = daysByDate.get(iso);
            const category = entry?.category_id ? categories.find((c) => c.id === entry.category_id) : undefined;
            const isToday = iso === toLocalISO(new Date());
            return (
              <div
                key={iso}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(iso)}
                className={`border-r border-b border-line last:border-r-0 p-1.5 min-h-[78px] flex flex-col ${
                  inMonth ? '' : 'opacity-35'
                }`}
                style={{ backgroundColor: category ? `${category.color}22` : undefined }}
              >
                <span className={`font-mono text-[10px] ${isToday ? 'text-harbor font-bold' : 'text-ink-soft'}`}>
                  {d.getDate()}
                </span>
                {category && (
                  <span className="text-[9px] font-mono truncate mt-0.5" style={{ color: category.color }}>
                    {category.name}
                  </span>
                )}
                <input
                  value={entry?.label ?? ''}
                  onChange={(e) => void upsertDay(iso, { label: e.target.value || null })}
                  className="mt-auto w-full bg-transparent outline-none text-[10px] px-0.5 py-0.5 rounded-sm focus:bg-white/70 leading-tight"
                  placeholder=""
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
