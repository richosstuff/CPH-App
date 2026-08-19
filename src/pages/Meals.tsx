import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { MealIdea, MealIdeaItem } from '../lib/types';
import { Plus, Trash2 } from 'lucide-react';

export default function Meals() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<MealIdea[]>([]);
  const [items, setItems] = useState<MealIdeaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: ideaData }, { data: itemData }] = await Promise.all([
      supabase.from('meal_ideas').select('*').eq('user_id', user!.id).order('position'),
      supabase.from('meal_idea_items').select('*').eq('user_id', user!.id),
    ]);
    setIdeas(ideaData ?? []);
    setItems(itemData ?? []);
    setLoading(false);
  }

  async function addIdea() {
    const { data } = await supabase
      .from('meal_ideas')
      .insert({ user_id: user!.id, name: 'New meal idea', notes: null, position: ideas.length })
      .select()
      .single();
    if (data) setIdeas((prev) => [...prev, data]);
  }

  async function updateIdea(id: string, patch: Partial<MealIdea>) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from('meal_ideas').update(patch).eq('id', id);
  }

  async function removeIdea(id: string) {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    setItems((prev) => prev.filter((i) => i.meal_idea_id !== id));
    await supabase.from('meal_ideas').delete().eq('id', id);
  }

  async function addItem(mealIdeaId: string) {
    const { data } = await supabase
      .from('meal_idea_items')
      .insert({ user_id: user!.id, meal_idea_id: mealIdeaId, item: 'New item' })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data]);
  }

  async function updateItem(id: string, patch: Partial<MealIdeaItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from('meal_idea_items').update(patch).eq('id', id);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('meal_idea_items').delete().eq('id', id);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Meals</h1>
      <p className="text-ink-soft mb-6 text-sm">
        A library of meal ideas, each with its own shopping list — no day-by-day logging, just dishes you can reach for.
      </p>

      {ideas.length === 0 && <p className="text-sm text-ink-soft mb-4">No meal ideas yet.</p>}

      <div className="space-y-4 mb-4">
        {ideas.map((idea) => {
          const ideaItems = items.filter((i) => i.meal_idea_id === idea.id);
          const total = ideaItems.reduce((sum, i) => sum + (i.estimated_price_dkk ?? 0), 0);
          return (
            <div key={idea.id} className="border border-line rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <input
                  value={idea.name}
                  onChange={(e) => void updateIdea(idea.id, { name: e.target.value })}
                  className="font-display text-xl flex-1 outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1"
                />
                <span className="font-mono text-xs text-ink-soft shrink-0">Est. {total.toLocaleString()} DKK</span>
              </div>
              <textarea
                value={idea.notes ?? ''}
                onChange={(e) => void updateIdea(idea.id, { notes: e.target.value || null })}
                placeholder="How to make it, why it's a keeper, batch-cook notes…"
                rows={2}
                className="w-full mb-3 px-1 -mx-1 bg-transparent outline-none text-sm text-ink-soft rounded-sm focus:bg-paper-dim/40 resize-none"
              />

              <div className="border border-line rounded-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper-dim/50 text-left">
                      <th className="font-medium px-3 py-1.5">Item</th>
                      <th className="font-medium px-3 py-1.5 w-20">Qty</th>
                      <th className="font-medium px-3 py-1.5 w-24">Price (DKK)</th>
                      <th className="font-medium px-3 py-1.5 w-24">Store</th>
                      <th className="font-medium px-3 py-1.5">Notes</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {ideaItems.map((item) => (
                      <tr key={item.id} className="border-b border-line last:border-0 group">
                        <td className="px-1.5 py-1">
                          <input
                            value={item.item}
                            onChange={(e) => void updateItem(item.id, { item: e.target.value })}
                            className="w-full px-1.5 py-0.5 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            value={item.quantity ?? ''}
                            onChange={(e) => void updateItem(item.id, { quantity: e.target.value || null })}
                            className="w-full px-1.5 py-0.5 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            type="number"
                            value={item.estimated_price_dkk ?? ''}
                            onChange={(e) =>
                              void updateItem(item.id, {
                                estimated_price_dkk: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="w-full px-1.5 py-0.5 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            value={item.supermarket ?? ''}
                            onChange={(e) => void updateItem(item.id, { supermarket: e.target.value || null })}
                            placeholder="Netto, Rema…"
                            className="w-full px-1.5 py-0.5 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            value={item.notes ?? ''}
                            onChange={(e) => void updateItem(item.id, { notes: e.target.value || null })}
                            className="w-full px-1.5 py-0.5 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => void removeItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1"
                            aria-label={`Remove ${item.item}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => void addItem(idea.id)}
                  className="flex items-center gap-2 px-3 py-2 border-t border-line bg-paper-dim/30 text-xs text-ink-soft hover:text-harbor w-full"
                >
                  <Plus className="w-3 h-3" />
                  Add ingredient
                </button>
              </div>

              <button
                onClick={() => void removeIdea(idea.id)}
                className="flex items-center gap-1.5 mt-3 text-xs text-ink-soft hover:text-rust"
              >
                <Trash2 className="w-3 h-3" />
                Remove meal idea
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => void addIdea()}
        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line border-dashed rounded-sm bg-white text-sm text-ink-soft hover:text-harbor hover:border-harbor w-full"
      >
        <Plus className="w-3.5 h-3.5" />
        Add meal idea
      </button>
    </div>
  );
}
