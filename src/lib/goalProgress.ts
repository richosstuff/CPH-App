import type { LifeGoal, GoalCheckpoint, FinancialGoal, Asset, ExchangeRate } from './types';
import { toDkk } from './currency';

export function financialGoalProgress(fg: FinancialGoal, assets: Asset[], rates: ExchangeRate[]): number {
  const linkedAsset = fg.linked_pot_id ? assets.find((a) => a.id === fg.linked_pot_id) : undefined;
  const current = linkedAsset ? toDkk(linkedAsset.balance, linkedAsset.currency, rates) : fg.current_amount;
  return fg.target_amount > 0 ? (current / fg.target_amount) * 100 : 0;
}

/** Sum of weights for done checkpoints, clamped to 100 — weights don't have to add up to exactly 100. */
export function checkpointProgress(checkpoints: GoalCheckpoint[]): number {
  const sum = checkpoints.filter((c) => c.is_done).reduce((s, c) => s + c.weight, 0);
  return Math.min(100, sum);
}

export type ProgressSource = 'checkpoints' | 'financial' | 'manual';

/** Priority: weighted checkpoints (if any exist) > linked financial goal > the manual progress_pct slider. */
export function computeGoalProgress(
  goal: LifeGoal,
  allCheckpoints: GoalCheckpoint[],
  financialGoals: FinancialGoal[],
  assets: Asset[],
  rates: ExchangeRate[]
): { pct: number; source: ProgressSource } {
  const goalCheckpoints = allCheckpoints.filter((c) => c.life_goal_id === goal.id);
  if (goalCheckpoints.length > 0) {
    return { pct: checkpointProgress(goalCheckpoints), source: 'checkpoints' };
  }
  if (goal.linked_financial_goal_id) {
    const fg = financialGoals.find((f) => f.id === goal.linked_financial_goal_id);
    if (fg) return { pct: financialGoalProgress(fg, assets, rates), source: 'financial' };
  }
  return { pct: goal.progress_pct, source: 'manual' };
}
