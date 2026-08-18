import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { ScheduleBlock, ScheduleCategory } from '../lib/types';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIES: ScheduleCategory[] = ['Class', 'Work', 'Sport', 'Cooking', 'Other'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORY_STYLE: Record<ScheduleCategory, string> = {
  Class: 'bg-harbor/10 text-harbor-dark',
  Work: 'bg-ink/10 text-ink',
  Sport: 'bg-moss/10 text-moss',
  Cooking: 'bg-rust/10 text-rust',
  Other: 'bg-paper-dim text-ink-soft',
};

export default function Schedule() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState<number | 'All'>('All');

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('schedule_blocks').select('*').eq('user_id', user!.id);
    setBlocks(data ?? []);
    setLoading(false);
  }

  async function update(id: string, patch: Partial<ScheduleBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    await supabase.from('schedule_blocks').update(patch).eq('id', id);
  }

  async function addRow() {
    const { data } = await supabase
      .from('schedule_blocks')
      .insert({
        user_id: user!.id,
        day_of_week: 0,
        start_time: '09:00',
        end_time: '10:00',
        title: 'New block',
        category: 'Other',
      })
      .select()
      .single();
    if (data) setBlocks((prev) => [...prev, data]);
  }

  async function removeRow(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('schedule_blocks').delete().eq('id', id);
  }

  const filtered = dayFilter === 'All' ? blocks : blocks.filter((b) => b.day_of_week === dayFilter);
  const sorted = [...filtered].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Schedule</h1>
      <p className="text-ink-soft mb-6 text-sm">Your recurring weekly timetable — classes, work, sport, and cooking blocks.</p>

      <div className="flex items-center gap-2 mb-3 font-mono text-xs flex-wrap">
        <span className="text-ink-soft">Filter</span>
        {(['All', 0, 1, 2, 3, 4, 5, 6] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDayFilter(d)}
            className={`px-2 py-1 rounded-sm ${
              dayFilter === d ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'
            }`}
          >
            {d === 'All' ? 'All' : DAY_NAMES[d].slice(0, 3)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-soft">Loading…</p>
      ) : (
        <div className="border border-line rounded-sm overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-dim/50 text-left">
                <th className="font-medium px-4 py-2 w-32">Day</th>
                <th className="font-medium px-4 py-2 w-24">Start</th>
                <th className="font-medium px-4 py-2 w-24">End</th>
                <th className="font-medium px-4 py-2">Title</th>
                <th className="font-medium px-4 py-2 w-28">Category</th>
                <th className="font-medium px-4 py-2">Location</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((block) => (
                <tr key={block.id} className="border-b border-line last:border-0 group">
                  <td className="px-2 py-1.5">
                    <select
                      value={block.day_of_week}
                      onChange={(e) => update(block.id, { day_of_week: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                    >
                      {DAY_NAMES.map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="time"
                      value={block.start_time}
                      onChange={(e) => update(block.id, { start_time: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="time"
                      value={block.end_time}
                      onChange={(e) => update(block.id, { end_time: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={block.title}
                      onChange={(e) => update(block.id, { title: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={block.category}
                      onChange={(e) => update(block.id, { category: e.target.value as ScheduleCategory })}
                      className={`w-full px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${CATEGORY_STYLE[block.category]}`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={block.location ?? ''}
                      onChange={(e) => update(block.id, { location: e.target.value || null })}
                      placeholder="Building / room"
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => void removeRow(block.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1.5"
                      aria-label={`Remove ${block.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => void addRow()}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add block
          </button>
        </div>
      )}
    </div>
  );
}
