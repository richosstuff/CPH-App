import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { GroceryList, GroceryListItem } from '../../lib/types';
import { Plus, Trash2, Check } from 'lucide-react';

function formatCompletedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ShoppingList() {
  const { user } = useAuth();
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryListItem[]>([]);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: groceryListData }, { data: groceryItemData }] = await Promise.all([
      supabase.from('grocery_lists').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('grocery_list_items').select('*').eq('user_id', user!.id).order('position'),
    ]);
    setGroceryLists(groceryListData ?? []);
    setGroceryItems(groceryItemData ?? []);
    setLoading(false);
  }

  async function addList() {
    const { data } = await supabase
      .from('grocery_lists')
      .insert({ user_id: user!.id, store_name: '' })
      .select()
      .single();
    if (data) setGroceryLists((prev) => [data, ...prev]);
  }

  async function updateListStoreName(id: string, store_name: string) {
    setGroceryLists((prev) => prev.map((l) => (l.id === id ? { ...l, store_name } : l)));
    await supabase.from('grocery_lists').update({ store_name }).eq('id', id);
  }

  async function removeList(id: string) {
    setGroceryLists((prev) => prev.filter((l) => l.id !== id));
    setGroceryItems((prev) => prev.filter((i) => i.list_id !== id));
    await supabase.from('grocery_lists').delete().eq('id', id);
  }

  // Re-derives whether a list counts as "done": every item checked, and at
  // least one item. Called after any add/toggle/remove so completed_at
  // tracks the moment that becomes true — and clears itself the moment an
  // edit (unchecking, or adding a fresh unchecked item) makes it false
  // again, since the list stays fully editable either way.
  async function recomputeCompletion(listId: string, itemsSnapshot: GroceryListItem[]) {
    const listItems = itemsSnapshot.filter((i) => i.list_id === listId);
    const allDone = listItems.length > 0 && listItems.every((i) => i.is_done);
    const list = groceryLists.find((l) => l.id === listId);
    if (!list) return;
    const wasComplete = list.completed_at != null;
    if (allDone === wasComplete) return;
    const completed_at = allDone ? new Date().toISOString() : null;
    setGroceryLists((prev) => prev.map((l) => (l.id === listId ? { ...l, completed_at } : l)));
    await supabase.from('grocery_lists').update({ completed_at }).eq('id', listId);
  }

  async function addGroceryItem(listId: string) {
    const text = (newItemText[listId] ?? '').trim();
    if (!text) return;
    const count = groceryItems.filter((i) => i.list_id === listId).length;
    const { data } = await supabase
      .from('grocery_list_items')
      .insert({ user_id: user!.id, list_id: listId, text, is_done: false, position: count })
      .select()
      .single();
    if (data) {
      const updated = [...groceryItems, data];
      setGroceryItems(updated);
      void recomputeCompletion(listId, updated);
    }
    setNewItemText((prev) => ({ ...prev, [listId]: '' }));
  }

  async function updateGroceryItemText(id: string, text: string) {
    setGroceryItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
    await supabase.from('grocery_list_items').update({ text }).eq('id', id);
  }

  async function toggleGroceryItem(id: string, listId: string, is_done: boolean) {
    const updated = groceryItems.map((i) => (i.id === id ? { ...i, is_done } : i));
    setGroceryItems(updated);
    await supabase.from('grocery_list_items').update({ is_done }).eq('id', id);
    void recomputeCompletion(listId, updated);
  }

  async function removeGroceryItem(id: string, listId: string) {
    const updated = groceryItems.filter((i) => i.id !== id);
    setGroceryItems(updated);
    await supabase.from('grocery_list_items').delete().eq('id', id);
    void recomputeCompletion(listId, updated);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <p className="text-ink-soft mb-4 text-sm">
        Check items off as you shop — a list auto-tags itself with the store and the moment everything's checked, and
        stays fully editable afterward.
      </p>
      {groceryLists.length === 0 && (
        <p className="text-sm text-ink-soft mb-4">No shopping lists yet — start one for your next store run.</p>
      )}
      <div className="space-y-4 mb-4">
        {groceryLists.map((list) => {
          const listItems = groceryItems.filter((i) => i.list_id === list.id);
          const doneCount = listItems.filter((i) => i.is_done).length;
          return (
            <div key={list.id} className="border border-line rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <input
                  value={list.store_name}
                  onChange={(e) => void updateListStoreName(list.id, e.target.value)}
                  placeholder="Which store?"
                  className="font-display text-xl flex-1 outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1"
                />
                {list.completed_at ? (
                  <span className="flex items-center gap-1.5 shrink-0 font-mono text-xs text-moss">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    Done · {formatCompletedAt(list.completed_at)}
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-xs text-ink-soft">
                    {doneCount}/{listItems.length} checked
                  </span>
                )}
              </div>

              <div className="space-y-1.5 mb-3">
                {listItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => void toggleGroceryItem(item.id, list.id, !item.is_done)}
                      className={`w-4 h-4 rounded-sm border shrink-0 inline-flex items-center justify-center ${
                        item.is_done ? 'bg-moss border-moss' : 'border-line hover:border-harbor'
                      }`}
                    >
                      {item.is_done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                    <input
                      value={item.text}
                      onChange={(e) => void updateGroceryItemText(item.id, e.target.value)}
                      className={`flex-1 min-w-0 px-1 -mx-1 bg-transparent outline-none text-sm rounded-sm focus:bg-paper-dim/40 ${
                        item.is_done ? 'line-through text-ink-soft' : ''
                      }`}
                    />
                    <button
                      onClick={() => void removeGroceryItem(item.id, list.id)}
                      className="text-ink-soft/60 hover:text-rust p-1 shrink-0"
                      aria-label={`Remove ${item.text}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <input
                value={newItemText[list.id] ?? ''}
                onChange={(e) => setNewItemText((prev) => ({ ...prev, [list.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && void addGroceryItem(list.id)}
                placeholder="Add an item…"
                className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor mb-3"
              />

              <button
                onClick={() => void removeList(list.id)}
                className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-rust"
              >
                <Trash2 className="w-3 h-3" />
                Remove list
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => void addList()}
        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line border-dashed rounded-sm bg-white text-sm text-ink-soft hover:text-harbor hover:border-harbor w-full"
      >
        <Plus className="w-3.5 h-3.5" />
        Start a shopping list
      </button>
    </div>
  );
}
