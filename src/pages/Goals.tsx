import { useState } from 'react';
import Overview from './goals/Overview';
import ControlCentre from './goals/ControlCentre';

const TABS = ['Goals', 'Control Centre'] as const;
type Tab = (typeof TABS)[number];

export default function Goals() {
  const [tab, setTab] = useState<Tab>('Goals');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  function openControlCentre(goalId: string) {
    setSelectedGoalId(goalId);
    setTab('Control Centre');
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Goals</h1>
      <p className="text-ink-soft mb-6 text-sm">Dream → measurable target → daily system → next checkpoint.</p>

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

      {tab === 'Goals' && <Overview onManageCheckpoints={openControlCentre} />}
      {tab === 'Control Centre' && <ControlCentre initialGoalId={selectedGoalId} />}
    </div>
  );
}
