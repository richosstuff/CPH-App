import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Todo } from '../lib/types';
import { reorder } from '../lib/dragReorder';
import { toLocalISO } from '../lib/dateUtils';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';

type SortMode = 'manual' | 'deadline';
const TABS = ['Active', 'Done'] as const;
type Tab = (typeof TABS)[number];

export default function Todos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('deadline');
  const [tab, setTab] = useState<Tab>('Active');

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('todos').select('*').eq('user_id', user!.id).order('position');
    setTodos(data ?? []);
    setLoading(false);
  }

  async function addTodo() {
    setTab('Active');
    const { data } = await supabase
      .from('todos')
      .insert({ user_id: user!.id, text: '', is_done: false, position: todos.length, deadline_date: null })
      .select()
      .single();
    if (data) setTodos((prev) => [...prev, data]);
  }

  async function updateTodo(id: string, patch: Partial<Todo>) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await supabase.from('todos').update(patch).eq('id', id);
  }

  /** Ticking stamps completed_at; unticking clears it — an active task never carries a stale "Done" date. */
  function toggleDone(todo: Todo) {
    const patch: Partial<Todo> = todo.is_done
      ? { is_done: false, completed_at: null }
      : { is_done: true, completed_at: new Date().toISOString() };
    void updateTodo(todo.id, patch);
  }

  /** Changes just the calendar date of completed_at (from the Done tab), keeping whatever time-of-day it already had. */
  function updateCompletedDate(todo: Todo, newDateStr: string) {
    if (!newDateStr) {
      void updateTodo(todo.id, { completed_at: null });
      return;
    }
    const [y, m, d] = newDateStr.split('-').map(Number);
    const next = todo.completed_at ? new Date(todo.completed_at) : new Date();
    next.setFullYear(y, m - 1, d);
    void updateTodo(todo.id, { completed_at: next.toISOString() });
  }

  async function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('todos').delete().eq('id', id);
  }

  async function persistOrder(newList: Todo[]) {
    setTodos(newList);
    await Promise.all(newList.map((t, i) => supabase.from('todos').update({ position: i }).eq('id', t.id)));
  }

  function inCurrentTab(t: Todo) {
    return tab === 'Active' ? !t.is_done : t.is_done;
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    // Reorder within the current tab, then splice that new order back into the full list —
    // position is a single global sequence shared by both tabs.
    const reorderedTab = reorder(displayed, dragIndex, index);
    let cursor = 0;
    const merged = todos.map((t) => (inCurrentTab(t) ? reorderedTab[cursor++] : t));
    void persistOrder(merged);
    setDragIndex(null);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  const openCount = todos.filter((t) => !t.is_done).length;
  const activeCount = openCount;
  const doneCount = todos.length - openCount;

  const byTab = todos.filter(inCurrentTab);
  const displayed =
    sortMode === 'deadline'
      ? [...byTab].sort((a, b) => (a.deadline_date ?? '9999-99-99').localeCompare(b.deadline_date ?? '9999-99-99'))
      : byTab;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-3xl">To-Do</h1>
        <span className="font-mono text-xs text-ink-soft">
          {openCount} open · {todos.length} total
        </span>
      </div>
      <p className="text-ink-soft mb-4 text-sm">Every task in one list, sorted the way you want it.</p>

      <div className="flex items-center gap-1 mb-4 font-mono text-xs border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 -mb-px border-b-2 transition-colors ${
              tab === t ? 'border-harbor text-harbor font-medium' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t} · {t === 'Active' ? activeCount : doneCount}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <p className="text-ink-soft text-sm">{sortMode === 'manual' ? 'Drag the handle to reorder.' : 'Sorted by deadline.'}</p>
        <span className="flex items-center gap-1 font-mono text-xs ml-2">
          {(['deadline', 'manual'] as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setSortMode(m)}
              className={`px-2 py-1 rounded-sm ${sortMode === m ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'}`}
            >
              {m === 'manual' ? 'Manual order' : 'By deadline'}
            </button>
          ))}
        </span>
      </div>

      <div className="border border-line rounded-sm overflow-hidden bg-white">
        {displayed.length === 0 && (
          <p className="px-4 py-3 text-sm text-ink-soft">
            {tab === 'Active' ? 'Nothing on the list yet.' : 'Nothing checked off yet.'}
          </p>
        )}
        {displayed.map((todo, i) => (
          <div
            key={todo.id}
            onDragOver={(e) => sortMode === 'manual' && e.preventDefault()}
            onDrop={() => sortMode === 'manual' && handleDrop(i)}
            className={`flex items-center gap-2 px-2 py-1.5 border-b border-line last:border-0 group ${
              dragIndex === i ? 'opacity-40' : ''
            }`}
          >
            <span
              draggable={sortMode === 'manual'}
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              className={`shrink-0 ${
                sortMode === 'manual' ? 'cursor-grab text-ink-soft/50 hover:text-ink-soft' : 'text-ink-soft/15'
              }`}
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <button
              onClick={() => toggleDone(todo)}
              className={`w-5 h-5 rounded-sm border shrink-0 inline-flex items-center justify-center ${
                todo.is_done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
              }`}
              aria-label={todo.is_done ? 'Mark not done' : 'Mark done'}
            >
              {todo.is_done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <input
              value={todo.text}
              onChange={(e) => void updateTodo(todo.id, { text: e.target.value })}
              placeholder="What needs doing?"
              className={`flex-1 px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 text-sm ${
                todo.is_done ? 'line-through text-ink-soft' : ''
              }`}
            />
            <input
              type="date"
              value={todo.deadline_date ?? ''}
              onChange={(e) => void updateTodo(todo.id, { deadline_date: e.target.value || null })}
              className="w-24 sm:w-[136px] shrink-0 px-1 sm:px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs text-ink-soft"
            />
            {tab === 'Done' && (
              <div
                className="shrink-0 w-28 sm:w-36 inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-moss/10 border border-moss/30"
                title="Date this was ticked off — edit to correct it"
              >
                <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-wide text-moss/70">Done</span>
                <input
                  type="date"
                  value={todo.completed_at ? toLocalISO(new Date(todo.completed_at)) : ''}
                  onChange={(e) => updateCompletedDate(todo, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none font-mono text-xs font-semibold text-moss"
                />
              </div>
            )}
            <button
              onClick={() => void removeTodo(todo.id)}
              className="text-ink-soft/60 hover:text-rust p-1.5 shrink-0"
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {tab === 'Active' && (
          <button
            onClick={() => void addTodo()}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to-do
          </button>
        )}
      </div>
    </div>
  );
}
