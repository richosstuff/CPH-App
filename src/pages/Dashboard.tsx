import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Phase, ChecklistItem, Habit, HabitEntry, WeeklyNote, Application, Contact } from '../lib/types';
import { getCurrentPhase, daysUntil, daysSince, currentWeekStart, addDays, WEEKDAY_LABELS } from '../lib/dateUtils';
import ProgressBar from '../components/ProgressBar';
import { Check, ArrowRight } from 'lucide-react';

const STALE_DAYS = 30;

export default function Dashboard() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [note, setNote] = useState<WeeklyNote | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
    const [phaseRes, itemRes, habitRes, entryRes, noteRes, appRes, contactRes] = await Promise.all([
      supabase.from('phases').select('*').eq('user_id', user!.id).order('phase_number'),
      supabase.from('checklist_items').select('*').eq('user_id', user!.id),
      supabase.from('habits').select('*').eq('user_id', user!.id).eq('is_active', true).order('position'),
      supabase.from('habit_entries').select('*').eq('user_id', user!.id).gte('entry_date', weekStart).lte('entry_date', weekEnd),
      supabase.from('weekly_notes').select('*').eq('user_id', user!.id).eq('week_start', weekStart).maybeSingle(),
      supabase.from('applications').select('*').eq('user_id', user!.id),
      supabase.from('network_contacts').select('*').eq('user_id', user!.id),
    ]);
    setPhases(phaseRes.data ?? []);
    setItems(itemRes.data ?? []);
    setHabits(habitRes.data ?? []);
    setEntries(entryRes.data ?? []);
    setNote(noteRes.data ?? null);
    setApplications(appRes.data ?? []);
    setContacts(contactRes.data ?? []);
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

  const current = getCurrentPhase(phases);
  const currentItems = items.filter((i) => i.phase_id === current?.id);
  const doneItems = currentItems.filter((i) => i.is_done).length;
  const nextDeadline = currentItems.find((i) => !i.is_done);
  const openApps = applications.filter((a) => !['Rejected', 'Offer'].includes(a.status));
  const priorities = [note?.priority_1, note?.priority_2, note?.priority_3].filter(Boolean);
  const staleContacts = contacts.filter(
    (c) => c.last_interaction_date == null || daysSince(c.last_interaction_date) >= STALE_DAYS
  );

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-1">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 className="font-display text-3xl mb-6">
        {current ? `Phase ${current.phase_number} — ${current.title}` : 'Copenhagen Chapter'}
      </h1>

      {staleContacts.length > 0 && (
        <Link
          to="/network"
          className="flex items-center justify-between gap-3 mb-6 px-4 py-2.5 rounded-sm bg-rust/10 text-rust text-sm hover:bg-rust/15 transition-colors"
        >
          <span>
            <strong className="font-medium">{staleContacts.length}</strong> stale contact
            {staleContacts.length === 1 ? '' : 's'} — no interaction logged in {STALE_DAYS}+ days
          </span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-line rounded-sm bg-white p-5 md:col-span-2">
          <p className="text-sm text-ink-soft mb-3">{current?.goal_text}</p>
          <ProgressBar value={currentItems.length ? (doneItems / currentItems.length) * 100 : 0} />
          <p className="font-mono text-xs text-ink-soft mt-2">
            {doneItems}/{currentItems.length} checklist items done
          </p>
          {nextDeadline && (
            <p className="text-sm mt-3">
              Next open item: <span className="text-ink">{nextDeadline.text}</span>
            </p>
          )}
        </div>

        <div className="border border-line rounded-sm bg-white p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Phase ends</p>
            <p className="font-display text-2xl">
              {current ? Math.abs(daysUntil(current.end_date)) : '—'}
              <span className="text-sm font-body text-ink-soft ml-1">days</span>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-line">
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Open applications</p>
            <p className="font-display text-2xl">{openApps.length}</p>
          </div>
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
