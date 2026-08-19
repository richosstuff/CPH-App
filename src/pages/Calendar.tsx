import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { CalendarCategory, CalendarDay, CalendarEvent } from '../lib/types';
import { WEEKDAY_LABELS, toLocalISO, monthGridDays } from '../lib/dateUtils';
import { sortDayEvents } from '../lib/calendarUtils';
import { ChevronLeft, ChevronRight, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

const CLEAR = '__clear__';

export default function CalendarPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);
  const [armedCategoryId, setArmedCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2d6e7e');
  const [addingEventFor, setAddingEventFor] = useState<string | null>(null);
  const [newEventText, setNewEventText] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: catData }, { data: dayData }, { data: eventData }] = await Promise.all([
      supabase.from('calendar_categories').select('*').eq('user_id', user!.id),
      supabase.from('calendar_days').select('*').eq('user_id', user!.id),
      supabase.from('calendar_events').select('*').eq('user_id', user!.id),
    ]);
    setCategories(catData ?? []);
    setDays(dayData ?? []);
    setEvents(eventData ?? []);
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
    if (armedCategoryId === id) setArmedCategoryId(null);
    await supabase.from('calendar_categories').delete().eq('id', id);
  }

  async function paintDay(iso: string, categoryId: string | null) {
    const existing = days.find((d) => d.date === iso);
    if (existing?.category_id === categoryId) return; // already painted this color — skip the redundant write
    if (existing) {
      setDays((prev) => prev.map((d) => (d.id === existing.id ? { ...d, category_id: categoryId } : d)));
      await supabase.from('calendar_days').update({ category_id: categoryId }).eq('id', existing.id);
    } else if (categoryId) {
      const { data } = await supabase
        .from('calendar_days')
        .insert({ user_id: user!.id, date: iso, category_id: categoryId, label: null })
        .select()
        .single();
      if (data) setDays((prev) => [...prev, data]);
    }
  }

  function handleDayClick(iso: string) {
    if (!armedCategoryId) return;
    void paintDay(iso, armedCategoryId === CLEAR ? null : armedCategoryId);
  }

  async function addEvent(iso: string) {
    if (!newEventText.trim()) return;
    const dayEvents = events.filter((e) => e.date === iso);
    const { data } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user!.id,
        date: iso,
        label: newEventText.trim(),
        time: newEventTime || null,
        position: dayEvents.length,
      })
      .select()
      .single();
    if (data) setEvents((prev) => [...prev, data]);
    setNewEventText('');
    setNewEventTime('');
  }

  async function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    await supabase.from('calendar_events').update(patch).eq('id', id);
  }

  async function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('calendar_events').delete().eq('id', id);
  }

  async function moveEvent(iso: string, eventId: string, direction: -1 | 1) {
    const dayEvents = sortDayEvents(events.filter((e) => e.date === iso));
    const idx = dayEvents.findIndex((e) => e.id === eventId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= dayEvents.length) return;
    const a = dayEvents[idx];
    const b = dayEvents[swapIdx];
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === a.id) return { ...e, position: b.position };
        if (e.id === b.id) return { ...e, position: a.position };
        return e;
      })
    );
    await Promise.all([
      supabase.from('calendar_events').update({ position: b.position }).eq('id', a.id),
      supabase.from('calendar_events').update({ position: a.position }).eq('id', b.id),
    ]);
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
      <p className="text-ink-soft mb-4 text-sm">
        Drag a category across days to color them, or click one below then click each day. Use "+ event" for a written note, with an optional time.
      </p>

      <div className="border border-line rounded-sm bg-white p-4 mb-4">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-2">
          Categories — drag onto days, or click to arm and then click days
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {categories.map((c) => (
            <span
              key={c.id}
              draggable
              onDragStart={() => setDragCategoryId(c.id)}
              onDragEnd={() => setDragCategoryId(null)}
              onClick={() => setArmedCategoryId((prev) => (prev === c.id ? null : c.id))}
              className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-sm text-xs font-medium text-white cursor-pointer active:cursor-grabbing transition-shadow ${
                armedCategoryId === c.id ? 'ring-2 ring-offset-1 ring-ink' : ''
              }`}
              style={{ backgroundColor: c.color }}
            >
              {c.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void removeCategory(c.id);
                }}
                className="hover:opacity-70"
                aria-label={`Delete ${c.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <span
            draggable
            onDragStart={() => setDragCategoryId(CLEAR)}
            onDragEnd={() => setDragCategoryId(null)}
            onClick={() => setArmedCategoryId((prev) => (prev === CLEAR ? null : CLEAR))}
            className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs border border-dashed border-line text-ink-soft cursor-pointer active:cursor-grabbing ${
              armedCategoryId === CLEAR ? 'ring-2 ring-offset-1 ring-ink' : ''
            }`}
          >
            Clear
          </span>
          {armedCategoryId && (
            <span className="text-xs text-harbor font-mono">
              armed — click days to apply · click the chip again to stop
            </span>
          )}
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
            const isPast = iso < toLocalISO(new Date());
            const dayEvents = sortDayEvents(events.filter((e) => e.date === iso));
            return (
              <div
                key={iso}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => {
                  if (dragCategoryId) void paintDay(iso, dragCategoryId === CLEAR ? null : dragCategoryId);
                }}
                onDrop={(e) => e.preventDefault()}
                onClick={() => handleDayClick(iso)}
                className={`relative border-r border-b border-line last:border-r-0 p-1.5 min-h-[92px] flex flex-col ${
                  inMonth ? '' : 'opacity-35'
                } ${armedCategoryId ? 'cursor-pointer hover:ring-1 hover:ring-inset hover:ring-harbor' : ''}`}
                style={{ backgroundColor: category ? category.color : undefined }}
              >
                {isPast && (
                  <X
                    className={`absolute inset-0 m-auto w-8 h-8 pointer-events-none ${category ? 'text-black/10' : 'text-ink-soft/15'}`}
                    strokeWidth={1.5}
                  />
                )}
                <span
                  className={`font-mono text-[10px] ${
                    isToday ? `font-bold ${category ? 'text-white' : 'text-harbor'}` : category ? 'text-white/90' : 'text-ink-soft'
                  }`}
                >
                  {d.getDate()}
                </span>

                <div className="mt-0.5 flex-1 min-h-0 overflow-y-auto space-y-0.5">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onMouseEnter={() => setHoveredEventId(ev.id)}
                      onMouseLeave={() => setHoveredEventId((prev) => (prev === ev.id ? null : prev))}
                      className="group/event flex items-center justify-between gap-0.5"
                    >
                      {hoveredEventId === ev.id ? (
                        <div className="flex items-center gap-0.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="time"
                            value={ev.time ?? ''}
                            onChange={(e) => void updateEvent(ev.id, { time: e.target.value || null })}
                            className={`w-[40px] shrink-0 bg-white/80 outline-none text-[8px] px-0.5 rounded-sm ${category ? '' : 'border border-line'}`}
                          />
                          <input
                            value={ev.label}
                            onChange={(e) => void updateEvent(ev.id, { label: e.target.value })}
                            className={`min-w-0 flex-1 bg-white/80 outline-none text-[9px] px-1 rounded-sm ${category ? '' : 'border border-line'}`}
                          />
                        </div>
                      ) : (
                        <span className={`text-[9px] truncate leading-tight ${category ? 'text-white' : 'text-ink'}`}>
                          {ev.time && <span className="opacity-70">{ev.time.slice(0, 5)} </span>}
                          {ev.label}
                        </span>
                      )}
                      <span className="opacity-0 group-hover/event:opacity-100 flex items-center shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void moveEvent(iso, ev.id, -1);
                          }}
                          className={category ? 'text-white/80 hover:text-white' : 'text-ink-soft hover:text-harbor'}
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void moveEvent(iso, ev.id, 1);
                          }}
                          className={category ? 'text-white/80 hover:text-white' : 'text-ink-soft hover:text-harbor'}
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void removeEvent(ev.id);
                          }}
                          className={category ? 'text-white/80 hover:text-white' : 'text-ink-soft hover:text-rust'}
                          aria-label="Remove event"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>

                {addingEventFor === iso ? (
                  <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="time"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className={`w-[52px] shrink-0 bg-white/80 outline-none text-[8px] px-0.5 py-0.5 rounded-sm ${category ? '' : 'border border-line'}`}
                    />
                    <input
                      autoFocus
                      value={newEventText}
                      onChange={(e) => setNewEventText(e.target.value)}
                      onBlur={() => {
                        void addEvent(iso);
                        setAddingEventFor(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void addEvent(iso);
                        if (e.key === 'Escape') {
                          setNewEventText('');
                          setAddingEventFor(null);
                        }
                      }}
                      placeholder="Event…"
                      className={`w-full min-w-0 bg-white/80 outline-none text-[9px] px-1 py-0.5 rounded-sm ${category ? '' : 'border border-line'}`}
                    />
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingEventFor(iso);
                      setNewEventText('');
                      setNewEventTime('');
                    }}
                    className={`text-[9px] text-left mt-0.5 ${category ? 'text-white/70 hover:text-white' : 'text-ink-soft/50 hover:text-harbor'}`}
                  >
                    + event
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
