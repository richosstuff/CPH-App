import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { MealIdea, MealIdeaItem, MealPlan, MealPlanItem } from '../lib/types';
import { Plus, Trash2, X } from 'lucide-react';

export default function Meals() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<MealIdea[]>([]);
  const [items, setItems] = useState<MealIdeaItem[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [planItems, setPlanItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: ideaData }, { data: itemData }, { data: planData }, { data: planItemData }] = await Promise.all([
      supabase.from('meal_ideas').select('*').eq('user_id', user!.id).order('position'),
      supabase.from('meal_idea_items').select('*').eq('user_id', user!.id),
      supabase.from('meal_plans').select('*').eq('user_id', user!.id).order('position'),
      supabase.from('meal_plan_items').select('*').eq('user_id', user!.id),
    ]);
    setIdeas(ideaData ?? []);
    setItems(itemData ?? []);
    setPlans(planData ?? []);
    setPlanItems(planItemData ?? []);
    setLoading(false);
  }

  // Meal ideas (individual dishes)

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
    setPlanItems((prev) => prev.filter((pi) => pi.meal_idea_id !== id));
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

  function ideaTotal(mealIdeaId: string): number {
    return items.filter((i) => i.meal_idea_id === mealIdeaId).reduce((sum, i) => sum + (i.estimated_price_dkk ?? 0), 0);
  }

  // Meal plans (bundles of existing meal ideas)

  async function addPlan() {
    const { data } = await supabase
      .from('meal_plans')
      .insert({ user_id: user!.id, name: 'New meal plan', notes: null, position: plans.length })
      .select()
      .single();
    if (data) setPlans((prev) => [...prev, data]);
  }

  async function updatePlan(id: string, patch: Partial<MealPlan>) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from('meal_plans').update(patch).eq('id', id);
  }

  async function removePlan(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setPlanItems((prev) => prev.filter((pi) => pi.meal_plan_id !== id));
    await supabase.from('meal_plans').delete().eq('id', id);
  }

  async function addPlanItem(planId: string, mealIdeaId: string) {
    const count = planItems.filter((pi) => pi.meal_plan_id === planId).length;
    const { data } = await supabase
      .from('meal_plan_items')
      .insert({ user_id: user!.id, meal_plan_id: planId, meal_idea_id: mealIdeaId, position: count })
      .select()
      .single();
    if (data) setPlanItems((prev) => [...prev, data]);
    setAddingToPlan(null);
  }

  async function removePlanItem(id: string) {
    setPlanItems((prev) => prev.filter((pi) => pi.id !== id));
    await supabase.from('meal_plan_items').delete().eq('id', id);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Meals</h1>
      <p className="text-ink-soft mb-6 text-sm">
        Meal plans bundle dishes together; meal ideas are the dishes themselves, each with its own shopping list.
      </p>

      <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Meal plans</h2>
      {plans.length === 0 && <p className="text-sm text-ink-soft mb-4">No meal plans yet — bundle a few meal ideas together below.</p>}
      <div className="space-y-4 mb-4">
        {plans.map((plan) => {
          const linkedItems = planItems.filter((pi) => pi.meal_plan_id === plan.id);
          const linkedIdeas = linkedItems
            .map((pi) => ({ link: pi, idea: ideas.find((i) => i.id === pi.meal_idea_id) }))
            .filter((x): x is { link: MealPlanItem; idea: MealIdea } => !!x.idea);
          const availableIdeas = ideas.filter((i) => !linkedItems.some((pi) => pi.meal_idea_id === i.id));
          const planTotal = linkedIdeas.reduce((sum, { idea }) => sum + ideaTotal(idea.id), 0);
          return (
            <div key={plan.id} className="border border-line rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <input
                  value={plan.name}
                  onChange={(e) => void updatePlan(plan.id, { name: e.target.value })}
                  className="font-display text-xl flex-1 outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1"
                />
                <span className="font-mono text-xs text-ink-soft shrink-0">Est. {planTotal.toLocaleString()} DKK</span>
              </div>
              <textarea
                value={plan.notes ?? ''}
                onChange={(e) => void updatePlan(plan.id, { notes: e.target.value || null })}
                placeholder="What this plan is for — a week's rotation, batch-cook Sunday…"
                rows={2}
                className="w-full mb-3 px-1 -mx-1 bg-transparent outline-none text-sm text-ink-soft rounded-sm focus:bg-paper-dim/40 resize-none"
              />

              <div className="flex flex-wrap gap-2 mb-3">
                {linkedIdeas.map(({ link, idea }) => (
                  <span key={link.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-sm text-xs bg-paper-dim text-ink">
                    {idea.name}
                    <button onClick={() => void removePlanItem(link.id)} className="text-ink-soft hover:text-rust" aria-label={`Remove ${idea.name} from plan`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {linkedIdeas.length === 0 && <span className="text-xs text-ink-soft">No meals added yet.</span>}
              </div>

              {addingToPlan === plan.id ? (
                <select
                  autoFocus
                  value=""
                  onChange={(e) => e.target.value && void addPlanItem(plan.id, e.target.value)}
                  onBlur={() => setAddingToPlan(null)}
                  className="border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
                >
                  <option value="" disabled>
                    Choose a meal idea…
                  </option>
                  {availableIdeas.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.name}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setAddingToPlan(plan.id)}
                  disabled={availableIdeas.length === 0}
                  className="flex items-center gap-1.5 text-xs text-harbor hover:underline disabled:opacity-40 disabled:no-underline mb-3"
                >
                  <Plus className="w-3 h-3" />
                  Add a meal to this plan
                </button>
              )}

              <div>
                <button onClick={() => void removePlan(plan.id)} className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-rust">
                  <Trash2 className="w-3 h-3" />
                  Remove plan
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => void addPlan()}
        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line border-dashed rounded-sm bg-white text-sm text-ink-soft hover:text-harbor hover:border-harbor w-full mb-8"
      >
        <Plus className="w-3.5 h-3.5" />
        Add meal plan
      </button>

      <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Meals</h2>
      {ideas.length === 0 && <p className="text-sm text-ink-soft mb-4">No meal ideas yet.</p>}
      <div className="space-y-4 mb-4">
        {ideas.map((idea) => {
          const ideaItems = items.filter((i) => i.meal_idea_id === idea.id);
          return (
            <div key={idea.id} className="border border-line rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <input
                  value={idea.name}
                  onChange={(e) => void updateIdea(idea.id, { name: e.target.value })}
                  className="font-display text-xl flex-1 outline-none bg-transparent rounded-sm focus:bg-paper-dim/40 px-1 -mx-1"
                />
                <span className="font-mono text-xs text-ink-soft shrink-0">Est. {ideaTotal(idea.id).toLocaleString()} DKK</span>
              </div>
              <textarea
                value={idea.notes ?? ''}
                onChange={(e) => void updateIdea(idea.id, { notes: e.target.value || null })}
                placeholder="How to make it, why it's a keeper, batch-cook notes…"
                rows={2}
                className="w-full mb-3 px-1 -mx-1 bg-transparent outline-none text-sm text-ink-soft rounded-sm focus:bg-paper-dim/40 resize-none"
              />

              <div className="border border-line rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
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
                </div>
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
