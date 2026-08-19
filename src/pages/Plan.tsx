import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Phase, ChecklistItem } from '../lib/types';
import { todayISO } from '../lib/dateUtils';
import ProgressBar from '../components/ProgressBar';
import { Check, Plus, Trash2 } from 'lucide-react';

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

  async function updatePhase(id: string, patch: Partial<Phase>) {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from('phases').update(patch).eq('id', id);
  }

  async function toggleItem(id: string, is_done: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_done } : i)));
    await supabase.from('checklist_items').update({ is_done }).eq('id', id);
  }

  async function updateItem(id: string, patch: Partial<ChecklistItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from('checklist_items').update(patch).eq('id', id);
  }

  async function addItem(phaseId: string) {
    const position = items.filter((i) => i.phase_id === phaseId).length;
    const { data } = await supabase
      .from('checklist_items')
      .insert({ user_id: user!.id, phase_id: phaseId, position, text: '', is_done: false, notes: null })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data]);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('checklist_items').delete().eq('id', id);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  const today = todayISO();

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">The Plan</h1>
      <p className="text-ink-soft mb-6 text-sm">The 24-month Lisbon → Copenhagen roadmap — every phase, every checkpoint. Fully editable.</p>

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                    <span>Phase {phase.phase_number} ·</span>
                    <input
                      type="date"
                      value={phase.start_date}
                      onChange={(e) => void updatePhase(phase.id, { start_date: e.target.value })}
                      className="bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 px-0.5"
                    />
                    <span>–</span>
                    <input
                      type="date"
                      value={phase.end_date}
                      onChange={(e) => void updatePhase(phase.id, { end_date: e.target.value })}
                      className="bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 px-0.5"
                    />
                    {isCurrent && <span className="text-harbor">· current</span>}
                    {isPast && <span>· past</span>}
                  </div>
                  <input
                    value={phase.title}
                    onChange={(e) => void updatePhase(phase.id, { title: e.target.value })}
                    className="font-display text-xl w-full outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1"
                  />
                </div>
                <span className="font-mono text-xs text-ink-soft shrink-0">
                  {doneCount}/{phaseItems.length}
                </span>
              </div>

              <textarea
                value={phase.goal_text}
                onChange={(e) => void updatePhase(phase.id, { goal_text: e.target.value })}
                rows={2}
                placeholder="Goal for this phase…"
                className="w-full mb-1 px-1 -mx-1 bg-transparent outline-none text-sm text-ink-soft rounded-sm focus:bg-paper-dim/40 resize-none"
              />
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-xs text-ink-soft shrink-0">Metric:</span>
                <input
                  value={phase.metric_text}
                  onChange={(e) => void updatePhase(phase.id, { metric_text: e.target.value })}
                  className="flex-1 px-1 -mx-1 bg-transparent outline-none text-xs text-ink-soft rounded-sm focus:bg-paper-dim/40"
                />
              </div>
              <ProgressBar value={phaseItems.length ? (doneCount / phaseItems.length) * 100 : 0} />

              <ul className="mt-4 space-y-2">
                {phaseItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5 group">
                    <button
                      onClick={() => void toggleItem(item.id, !item.is_done)}
                      className={`w-4 h-4 mt-0.5 rounded-sm border shrink-0 inline-flex items-center justify-center ${
                        item.is_done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                      }`}
                    >
                      {item.is_done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <input
                        value={item.text}
                        onChange={(e) => void updateItem(item.id, { text: e.target.value })}
                        className={`w-full px-1 -mx-1 bg-transparent outline-none text-sm rounded-sm focus:bg-paper-dim/40 ${
                          item.is_done ? 'line-through text-ink-soft' : ''
                        }`}
                      />
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) => void updateItem(item.id, { notes: e.target.value || null })}
                        placeholder="Notes…"
                        className="w-full mt-0.5 px-1 -mx-1 bg-transparent outline-none text-xs text-ink-soft rounded-sm focus:bg-paper-dim/40"
                      />
                    </div>
                    <button
                      onClick={() => void removeItem(item.id)}
                      className="text-ink-soft/60 hover:text-rust p-1 shrink-0"
                      aria-label="Remove checklist item"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => void addItem(phase.id)}
                className="flex items-center gap-1.5 mt-3 text-xs text-ink-soft hover:text-harbor"
              >
                <Plus className="w-3 h-3" />
                Add checklist item
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
