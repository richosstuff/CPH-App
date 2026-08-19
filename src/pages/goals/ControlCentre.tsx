import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { LifeGoal, GoalCheckpoint } from '../../lib/types';
import { checkpointProgress } from '../../lib/goalProgress';
import { reorder } from '../../lib/dragReorder';
import ProgressBar from '../../components/ProgressBar';
import { Plus, Trash2, GripVertical, Check } from 'lucide-react';

export default function ControlCentre({ initialGoalId }: { initialGoalId: string | null }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [checkpoints, setCheckpoints] = useState<GoalCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(initialGoalId);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  useEffect(() => {
    if (initialGoalId) setSelectedId(initialGoalId);
  }, [initialGoalId]);

  async function load() {
    setLoading(true);
    const [{ data: goalData }, { data: cpData }] = await Promise.all([
      supabase.from('life_goals').select('*').eq('user_id', user!.id),
      supabase.from('goal_checkpoints').select('*').eq('user_id', user!.id).order('position'),
    ]);
    setGoals(goalData ?? []);
    setCheckpoints(cpData ?? []);
    setSelectedId((prev) => prev ?? (goalData && goalData.length > 0 ? goalData[0].id : null));
    setLoading(false);
  }

  async function updateGoalNotes(id: string, notes: string) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, notes } : g)));
    await supabase.from('life_goals').update({ notes: notes || null }).eq('id', id);
  }

  async function addCheckpoint(goalId: string) {
    const count = checkpoints.filter((c) => c.life_goal_id === goalId).length;
    const { data } = await supabase
      .from('goal_checkpoints')
      .insert({
        user_id: user!.id,
        life_goal_id: goalId,
        label: 'New checkpoint',
        description: null,
        weight: 0,
        is_done: false,
        position: count,
      })
      .select()
      .single();
    if (data) setCheckpoints((prev) => [...prev, data]);
  }

  async function updateCheckpoint(id: string, patch: Partial<GoalCheckpoint>) {
    setCheckpoints((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase.from('goal_checkpoints').update(patch).eq('id', id);
  }

  async function removeCheckpoint(id: string) {
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('goal_checkpoints').delete().eq('id', id);
  }

  async function persistOrder(goalId: string, newList: GoalCheckpoint[]) {
    setCheckpoints((prev) => [...prev.filter((c) => c.life_goal_id !== goalId), ...newList]);
    await Promise.all(newList.map((c, i) => supabase.from('goal_checkpoints').update({ position: i }).eq('id', c.id)));
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  if (goals.length === 0) {
    return <p className="text-sm text-ink-soft">Add a goal from the Goals tab first.</p>;
  }

  const selected = goals.find((g) => g.id === selectedId) ?? goals[0];
  const goalCheckpoints = checkpoints.filter((c) => c.life_goal_id === selected.id);
  const totalWeight = goalCheckpoints.reduce((sum, c) => sum + c.weight, 0);
  const donePct = checkpointProgress(goalCheckpoints);

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    void persistOrder(selected.id, reorder(goalCheckpoints, dragIndex, index));
    setDragIndex(null);
  }

  return (
    <div>
      <label className="block max-w-md mb-6">
        <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Managing</span>
        <select
          value={selected.id}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
        >
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.domain} — {g.dream}
            </option>
          ))}
        </select>
      </label>

      <div className="border border-line rounded-sm bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-2 gap-3">
          <h2 className="font-display text-lg">{selected.dream}</h2>
          <span className="font-mono text-xs text-ink-soft shrink-0">
            {Math.round(donePct)}% · weights sum to {totalWeight}/100
          </span>
        </div>
        <ProgressBar value={donePct} />
        <textarea
          value={selected.notes ?? ''}
          onChange={(e) => void updateGoalNotes(selected.id, e.target.value)}
          placeholder="Why this goal matters, the bigger picture, anything worth remembering…"
          rows={2}
          className="w-full mt-3 px-1 -mx-1 bg-transparent outline-none text-sm text-ink-soft rounded-sm focus:bg-paper-dim/40 resize-none"
        />
      </div>

      <div className="border border-line rounded-sm overflow-hidden bg-white mb-4">
        {goalCheckpoints.length === 0 && (
          <p className="px-4 py-3 text-sm text-ink-soft">
            No checkpoints yet — this goal's progress falls back to the manual slider on the Goals tab.
          </p>
        )}
        {goalCheckpoints.map((cp, i) => (
          <div
            key={cp.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className={`flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 group ${
              dragIndex === i ? 'opacity-40' : ''
            }`}
          >
            <span
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              className="cursor-grab text-ink-soft/40 hover:text-ink-soft mt-1 shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <button
              onClick={() => void updateCheckpoint(cp.id, { is_done: !cp.is_done })}
              className={`w-5 h-5 mt-0.5 rounded-sm border shrink-0 inline-flex items-center justify-center ${
                cp.is_done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
              }`}
            >
              {cp.is_done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-0">
              <input
                value={cp.label}
                onChange={(e) => void updateCheckpoint(cp.id, { label: e.target.value })}
                className={`w-full font-medium text-sm outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1 ${
                  cp.is_done ? 'line-through text-ink-soft' : ''
                }`}
              />
              <input
                value={cp.description ?? ''}
                onChange={(e) => void updateCheckpoint(cp.id, { description: e.target.value || null })}
                placeholder="Description…"
                className="w-full mt-0.5 text-xs text-ink-soft outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1"
              />
            </div>
            <label className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                value={cp.weight}
                onChange={(e) => void updateCheckpoint(cp.id, { weight: Number(e.target.value) || 0 })}
                className="w-14 border border-line rounded-sm px-1.5 py-1 font-mono text-xs text-right outline-none focus:border-harbor"
              />
              <span className="text-xs text-ink-soft">%</span>
            </label>
            <button
              onClick={() => void removeCheckpoint(cp.id)}
              className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1 shrink-0"
              aria-label="Remove checkpoint"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => void addCheckpoint(selected.id)}
          className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Add checkpoint
        </button>
      </div>
    </div>
  );
}
