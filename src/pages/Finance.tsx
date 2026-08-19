import { useState } from 'react';
import Financials from './finance/Financials';
import IncomeSavingsPlan from './finance/IncomeSavingsPlan';
import Portfolio from './finance/Portfolio';
import FinancialGoals from './finance/FinancialGoals';

const TABS = ['Financials', 'Income & Savings Plan', 'Portfolio', 'Goals'] as const;
type Tab = (typeof TABS)[number];

export default function Finance() {
  const [tab, setTab] = useState<Tab>('Financials');

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Finance</h1>
      <p className="text-ink-soft mb-6 text-sm">Daily money, the plan behind it, the portfolio it builds, and what it's for.</p>

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

      {tab === 'Financials' && <Financials />}
      {tab === 'Income & Savings Plan' && <IncomeSavingsPlan />}
      {tab === 'Portfolio' && <Portfolio />}
      {tab === 'Goals' && <FinancialGoals />}
    </div>
  );
}
