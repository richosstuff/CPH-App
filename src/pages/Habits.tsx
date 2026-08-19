import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Habit, HabitEntry, WeeklyNote } from '../lib/types';
import { WEEKDAY_LABELS, addDays, currentWeekStart, formatShortDate } from '../lib/dateUtils';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

const emptyNote = (weekStart: string): WeeklyNote => ({
  id: '',
  user_id: '',
  week_start: weekStart,
  monthly_goal: '',
  priority_1: '',
  priority_2: '',
  priority_3: '',
  reflection: '',
});

export default function Habits() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [note, setNote] = useState<WeeklyNote>(emptyNote(currentWeekStart()));
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (!user) return;
    void loadWeek();
    void loadHabits();
  }, [user, weekStart]);

  async function loadHabits() {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('position');
    setHabits(data ?? []);
  }

  async function loadWeek() {
    setLoading(true);
    const weekEnd = addDays(weekStart, 6);
    const [{ data: entryData }, { data: noteData }] = await Promise.all([
      supabase
        .from('habit_entries')
        .select('*')
        .eq('user_id', user!.id)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd),
      supabase
        .from('weekly_notes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('week_start', weekStart)
        .maybeSingle(),
    ]);
    setEntries(entryData ?? []);
    setNote(noteData ?? emptyNote(weekStart));
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

  async function saveNote(patch: Partial<WeeklyNote>) {
    const updated = { ...note, ...patch };
    setNote(updated);
    const { data } = await supabase
      .from('weekly_notes')
      .upsert(
        { ...updated, user_id: user!.id, week_start: weekStart, id: note.id || undefined },
        { onConflict: 'user_id,week_start' }
      )
      .select()
      .single();
    if (data) setNote(data);
  }

  async function addHabit() {
    if (!newHabitName.trim()) return;
    const { data } = await supabase
      .from('habits')
      .insert({ user_id: user!.id, name: newHabitName.trim(), is_active: true, position: habits.length })
      .select()
      .single();
    if (data) setHabits((prev) => [...prev, data]);
    setNewHabitName('');
  }

  async function removeHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await supabase.from('habits').update({ is_active: false }).eq('id', id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Weekly Log</h1>
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
      <p className="text-ink-soft mb-6 text-sm">Keep the habit list short — five to eight things that matter right now.</p>

      <div className="mb-4">
        <input
          value={note.monthly_goal}
          onChange={(e) => setNote({ ...note, monthly_goal: e.target.value })}
          onBlur={(e) => void saveNote({ monthly_goal: e.target.value })}
          placeholder="Monthly goal — what is this month actually for?"
          className="w-full border border-line rounded-sm px-3 py-2 bg-white text-sm focus:border-harbor outline-none"
        />
      </div>

      {loading ? (
        <p className="text-ink-soft">Loading…</p>
      ) : (
        <div className="border border-line rounded-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-dim/50">
                <th className="text-left font-medium px-4 py-2 w-48">Habit / Task</th>
                {days.map((d) => (
                  <th key={d} className="font-mono text-xs font-normal text-ink-soft py-2 w-12 text-center">
                    {WEEKDAY_LABELS[new Date(d + 'T00:00:00').getDay() === 0 ? 6 : new Date(d + 'T00:00:00').getDay() - 1]}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => (
                <tr key={habit.id} className="border-b border-line last:border-0 group">
                  <td className="px-4 py-2.5">{habit.name}</td>
                  {days.map((date) => {
                    const done = entries.some((e) => e.habit_id === habit.id && e.entry_date === date);
                    return (
                      <td key={date} className="text-center">
                        <button
                          onClick={() => void toggleEntry(habit.id, date)}
                          className={`w-6 h-6 rounded-sm border inline-flex items-center justify-center transition-colors ${
                            done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                          }`}
                          aria-label={`${habit.name} on ${date}`}
                        >
                          {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <button
                      onClick={() => void removeHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1"
                      aria-label={`Remove ${habit.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30">
            <Plus className="w-3.5 h-3.5 text-ink-soft" />
            <input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addHabit()}
              placeholder="Add a habit for this month…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="border border-line rounded-sm p-4 bg-white">
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">
            Top 3 priorities this week
          </h2>
          <div className="space-y-2">
            {(['priority_1', 'priority_2', 'priority_3'] as const).map((key, i) => (
              <input
                key={key}
                value={note[key]}
                onChange={(e) => setNote({ ...note, [key]: e.target.value })}
                onBlur={(e) => void saveNote({ [key]: e.target.value })}
                placeholder={`${i + 1}.`}
                className="w-full border-b border-line py-1 text-sm focus:border-harbor outline-none bg-transparent"
              />
            ))}
          </div>
        </div>
        <div className="border border-line rounded-sm p-4 bg-white">
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">
            Notes / reflection
          </h2>
          <textarea
            value={note.reflection}
            onChange={(e) => setNote({ ...note, reflection: e.target.value })}
            onBlur={(e) => void saveNote({ reflection: e.target.value })}
            rows={4}
            className="w-full text-sm outline-none resize-none bg-transparent"
            placeholder="How did the week actually go?"
          />
        </div>
      </div>
    </div>
  );
}
