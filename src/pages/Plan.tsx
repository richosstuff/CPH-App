import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Phase, ChecklistItem } from '../lib/types';
import { formatShortDate, todayISO } from '../lib/dateUtils';
import ProgressBar from '../components/ProgressBar';
import { Check } from 'lucide-react';

export default function Plan() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: phaseData }, { data: itemData }] = await Promise.all([
      supabase.from('phases').select('*').eq('user_id', user!.id).order('phase_number'),
      supabase.from('checklist_items').select('*').eq('user_id', user!.id).order('position'),
    ]);
    setPhases(phaseData ?? []);
    setItems(itemData ?? []);
    setLoading(false);
  }

  async function toggleItem(id: string, is_done: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_done } : i)));
    await supabase.from('checklist_items').update({ is_done }).eq('id', id);
  }

  async function updateNotes(id: string, notes: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)));
    await supabase.from('checklist_items').update({ notes: notes || null }).eq('id', id);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  const today = todayISO();

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">The Plan</h1>
      <p className="text-ink-soft mb-6 text-sm">The 24-month Lisbon → Copenhagen roadmap — every phase, every checkpoint.</p>

      {phases.length === 0 && <p className="text-sm text-ink-soft">No phases seeded yet.</p>}

      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseItems = items.filter((i) => i.phase_id === phase.id);
          const doneCount = phaseItems.filter((i) => i.is_done).length;
          const isCurrent = today >= phase.start_date && today <= phase.end_date;
          const isPast = today > phase.end_date;
          return (
            <div
              key={phase.id}
              className={`border rounded-sm bg-white p-5 ${isCurrent ? 'border-harbor' : 'border-line'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                    Phase {phase.phase_number} · {formatShortDate(phase.start_date)} – {formatShortDate(phase.end_date)}
                    {isCurrent && <span className="ml-2 text-harbor">· current</span>}
                    {isPast && <span className="ml-2">· past</span>}
                  </p>
                  <h2 className="font-display text-xl">{phase.title}</h2>
                </div>
                <span className="font-mono text-xs text-ink-soft shrink-0">
                  {doneCount}/{phaseItems.length}
                </span>
              </div>
              <p className="text-sm text-ink-soft mb-1">{phase.goal_text}</p>
              <p className="text-xs text-ink-soft mb-3">Metric: {phase.metric_text}</p>
              <ProgressBar value={phaseItems.length ? (doneCount / phaseItems.length) * 100 : 0} />

              <ul className="mt-4 space-y-2">
                {phaseItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <button
                      onClick={() => void toggleItem(item.id, !item.is_done)}
                      className={`w-4 h-4 mt-0.5 rounded-sm border shrink-0 inline-flex items-center justify-center ${
                        item.is_done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                      }`}
                    >
                      {item.is_done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.is_done ? 'line-through text-ink-soft' : ''}`}>{item.text}</p>
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) => void updateNotes(item.id, e.target.value)}
                        placeholder="Notes…"
                        className="w-full mt-0.5 px-1 py-0.5 bg-transparent outline-none text-xs text-ink-soft rounded-sm focus:bg-paper-dim/40"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
