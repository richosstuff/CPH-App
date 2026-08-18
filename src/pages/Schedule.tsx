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

const CATEGORY_BLOCK_STYLE: Record<ScheduleCategory, string> = {
  Class: 'bg-harbor text-white',
  Work: 'bg-ink text-white',
  Sport: 'bg-moss text-white',
  Cooking: 'bg-rust text-white',
  Other: 'bg-paper-dim text-ink-soft border border-line',
};

const HOUR_PX = 56;
const DEFAULT_RANGE = { start: 7, end: 22 };

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Grid hour bounds: the default daytime window, expanded to fit any block that falls outside it. */
function computeRange(allBlocks: ScheduleBlock[]): { start: number; end: number } {
  if (allBlocks.length === 0) return DEFAULT_RANGE;
  const starts = allBlocks.map((b) => Math.floor(toMinutes(b.start_time) / 60));
  const ends = allBlocks.map((b) => Math.ceil(toMinutes(b.end_time) / 60));
  return {
    start: Math.min(DEFAULT_RANGE.start, ...starts),
    end: Math.max(DEFAULT_RANGE.end, ...ends),
  };
}

/** Assigns overlapping same-day blocks to side-by-side columns instead of stacking illegibly. */
function layoutDay(dayBlocks: ScheduleBlock[]) {
  const sortedBlocks = [...dayBlocks].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const clusters: ScheduleBlock[][] = [];
  let clusterEnd = -1;
  for (const block of sortedBlocks) {
    const start = toMinutes(block.start_time);
    if (clusters.length === 0 || start >= clusterEnd) {
      clusters.push([block]);
      clusterEnd = toMinutes(block.end_time);
    } else {
      clusters[clusters.length - 1].push(block);
      clusterEnd = Math.max(clusterEnd, toMinutes(block.end_time));
    }
  }
  return clusters.flatMap((cluster) => cluster.map((block, i) => ({ block, col: i, of: cluster.length })));
}

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
  const { start: rangeStart, end: rangeEnd } = computeRange(blocks);
  const todayIdx = (new Date().getDay() + 6) % 7;

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
        <>
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

        <div className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Weekly view</h2>
          <div className="border border-line rounded-sm bg-white overflow-x-auto">
            <div style={{ minWidth: 56 + DAY_NAMES.length * 96 }}>
              <div className="flex border-b border-line">
                <div className="w-14 shrink-0 sticky left-0 bg-white" />
                {DAY_NAMES.map((name, i) => (
                  <div
                    key={name}
                    className={`flex-1 min-w-[96px] text-center font-mono text-xs uppercase tracking-wide py-2 ${
                      i === todayIdx ? 'text-harbor font-semibold' : 'text-ink-soft'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div className="flex relative" style={{ height: (rangeEnd - rangeStart) * HOUR_PX }}>
                <div className="w-14 shrink-0 sticky left-0 bg-white z-10 border-r border-line relative">
                  {Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i).map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 text-right pr-1.5 -translate-y-1/2 font-mono text-[10px] text-ink-soft"
                      style={{ top: (h - rangeStart) * HOUR_PX }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                {DAY_NAMES.map((_, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="flex-1 min-w-[96px] relative border-r border-line last:border-r-0"
                    style={{
                      backgroundColor: dayIdx === todayIdx ? 'rgba(45,110,126,0.05)' : undefined,
                      backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
                    }}
                  >
                    {layoutDay(blocks.filter((b) => b.day_of_week === dayIdx)).map(({ block, col, of }) => {
                      const top = (toMinutes(block.start_time) - rangeStart * 60) * (HOUR_PX / 60);
                      const height = Math.max(
                        (toMinutes(block.end_time) - toMinutes(block.start_time)) * (HOUR_PX / 60),
                        18
                      );
                      return (
                        <div
                          key={block.id}
                          className={`absolute rounded-sm px-1.5 py-1 text-[11px] leading-tight overflow-hidden ${CATEGORY_BLOCK_STYLE[block.category]}`}
                          style={{
                            top,
                            height,
                            left: `calc(${(col / of) * 100}% + 2px)`,
                            width: `calc(${(1 / of) * 100}% - 4px)`,
                          }}
                          title={`${block.title} · ${block.start_time}–${block.end_time}${block.location ? ' · ' + block.location : ''}`}
                        >
                          <div className="font-medium truncate">{block.title}</div>
                          <div className="opacity-80 truncate">
                            {block.start_time}–{block.end_time}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
