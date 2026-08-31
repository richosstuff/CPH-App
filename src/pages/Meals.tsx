import { useState } from 'react';
import ShoppingList from './meals/ShoppingList';
import MealPlans from './meals/MealPlans';
import MealIdeas from './meals/MealIdeas';

const TABS = ['Shopping List', 'Meals', 'Meal Plans'] as const;
type Tab = (typeof TABS)[number];

export default function Meals() {
  const [tab, setTab] = useState<Tab>('Shopping List');

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Groceries</h1>
      <p className="text-ink-soft mb-6 text-sm">What to buy, what to cook, and the ingredient lists behind it.</p>

      <div className="flex items-center gap-1 mb-6 font-mono text-xs border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 -mb-px border-b-2 transition-colors ${
              tab === t ? 'border-harbor text-harbor font-medium' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Shopping List' && <ShoppingList />}
      {tab === 'Meal Plans' && <MealPlans />}
      {tab === 'Meals' && <MealIdeas />}
    </div>
  );
}
