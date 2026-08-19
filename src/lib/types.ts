export interface Phase {
  id: string;
  user_id: string;
  phase_number: number;
  title: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  goal_text: string;
  metric_text: string;
}

export interface ChecklistItem {
  id: string;
  user_id: string;
  phase_id: string;
  position: number;
  text: string;
  is_done: boolean;
  notes: string | null;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  position: number;
}

export interface HabitEntry {
  id: string;
  user_id: string;
  habit_id: string;
  entry_date: string; // ISO date, always a Mon-Sun day
  completed: boolean;
}

export type ApplicationStatus = 'Not applied' | 'Applied/Assessment' | 'Interview' | 'Offer' | 'Rejected';

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  deadline_date: string | null;
  status: ApplicationStatus;
  notes: string | null;
}

export interface WeeklyNote {
  id: string;
  user_id: string;
  week_start: string; // ISO date, Monday
  monthly_goal: string;
  priority_1: string;
  priority_2: string;
  priority_3: string;
  reflection: string;
}

export interface MonthlyFinance {
  id: string;
  user_id: string;
  month: string; // ISO date, first of month
  actual_net_income_dkk: number | null;
  savings_dkk: number | null;
}

export type ContactCategory = 'DTU' | 'Work' | 'Sport' | 'Social' | 'Other';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  category: ContactCategory;
  met_where: string | null;
  met_date: string | null; // ISO date
  last_interaction_date: string | null; // ISO date
  notes: string | null;
  follow_up: boolean;
}

export interface MealWeek {
  id: string;
  user_id: string;
  week_start: string; // ISO date, Monday
  notes: string;
  budget_dkk: number | null;
}

export interface MealDay {
  id: string;
  user_id: string;
  week_start: string; // ISO date, Monday
  day_of_week: number; // 0 = Monday .. 6 = Sunday
  dinner: string;
  is_batch_cooked: boolean;
  is_leftovers: boolean;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  week_start: string; // ISO date, Monday
  item: string;
  quantity: string | null;
  estimated_price_dkk: number | null;
  supermarket: string | null;
  notes: string | null;
}

export type ScheduleCategory = 'Class' | 'Work' | 'Sport' | 'Cooking' | 'Other';

export interface ScheduleBlock {
  id: string;
  user_id: string;
  day_of_week: number; // 0 = Monday .. 6 = Sunday
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  title: string;
  category: ScheduleCategory;
  location: string | null;
}

export type Currency = 'DKK' | 'EUR' | 'GBP' | 'USD' | 'SEK';

export type ExpenseCategory =
  | 'Food & Groceries'
  | 'Housing'
  | 'Transport'
  | 'Education & Books'
  | 'Sport & Gym'
  | 'Going Out'
  | 'Travel'
  | 'Subscriptions'
  | 'Other';

export interface Expense {
  id: string;
  user_id: string;
  date: string; // ISO date
  description: string;
  amount: number;
  currency: Currency;
  amount_dkk: number;
  category: ExpenseCategory;
  label: string | null;
}

export type AssetType = 'Bank account' | 'ETF or Index fund' | 'Crypto' | 'Cash' | 'Other';

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  institution: string | null;
  currency: Currency;
  balance: number;
  last_updated: string | null; // ISO date
  notes: string | null;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: Currency;
  last_updated: string | null; // ISO date
}

export type FinancialGoalStatus = 'On track' | 'Behind' | 'Achieved';

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null; // ISO date
  current_amount: number;
  linked_pot_id: string | null;
  notes: string | null;
  status: FinancialGoalStatus;
}

export type LifeGoalDomain =
  | 'Financial'
  | 'Academic'
  | 'Physical'
  | 'Social & Relationships'
  | 'Career'
  | 'Personal';

export type LifeGoalStatus = 'Active' | 'Achieved' | 'Paused';

export interface LifeGoal {
  id: string;
  user_id: string;
  domain: LifeGoalDomain;
  dream: string;
  measurable_target: string;
  daily_system: string;
  next_checkpoint: string | null;
  next_checkpoint_date: string | null; // ISO date — drives the Dashboard's 30-day proximity alert
  progress_pct: number; // manual fallback — overridden by weighted GoalCheckpoints when any exist, or by the linked financial goal
  linked_financial_goal_id: string | null;
  notes: string | null;
  status: LifeGoalStatus;
}

/**
 * A weighted milestone toward a LifeGoal. When a goal has any checkpoints, its progress bar is
 * derived from these instead of the manual slider: sum of weights where is_done, clamped to 100.
 */
export interface GoalCheckpoint {
  id: string;
  user_id: string;
  life_goal_id: string;
  label: string;
  description: string | null;
  weight: number; // contribution toward 100% progress when done
  is_done: boolean;
  position: number;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  month: string; // ISO date, first of month
  net_worth_dkk: number;
}

export interface ExchangeRate {
  id: string;
  user_id: string;
  currency: Currency;
  rate_to_dkk: number;
}

export type TransactionType = 'Expense' | 'Income';

export type IncomeCategory = 'Salary' | 'SU (Student Grant)' | 'Freelance' | 'Gift' | 'Other';

export interface Transaction {
  id: string;
  user_id: string;
  date: string; // ISO date
  type: TransactionType;
  description: string;
  amount: number;
  currency: Currency;
  amount_dkk: number;
  category: string; // one of EXPENSE_CATEGORIES when type is 'Expense', IncomeCategory when 'Income'
  label: string | null;
}

export interface Todo {
  id: string;
  user_id: string;
  text: string;
  is_done: boolean;
  position: number;
  deadline_date: string | null; // ISO date
}

/** A recipe/dish idea — not tied to any day or week. Its shopping list is MealIdeaItem rows. */
export interface MealIdea {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  position: number;
}

export interface MealIdeaItem {
  id: string;
  user_id: string;
  meal_idea_id: string;
  item: string;
  quantity: string | null;
  estimated_price_dkk: number | null;
  supermarket: string | null;
  notes: string | null;
}

/** A named bundle of existing meal ideas (e.g. "Week of quick meals") — references them, doesn't duplicate their ingredients. */
export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  position: number;
}

export interface MealPlanItem {
  id: string;
  user_id: string;
  meal_plan_id: string;
  meal_idea_id: string;
  position: number;
}

export interface CalendarCategory {
  id: string;
  user_id: string;
  name: string;
  color: string; // hex
}

/** Sparse — a row only exists for a date once a category or label has been set on it. */
export interface CalendarDay {
  id: string;
  user_id: string;
  date: string; // ISO date
  category_id: string | null;
  label: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  text: string;
  position: number;
}

/** Multiple allowed per date, unlike CalendarDay which is one row per date. Ordered by time when set, else by position. */
export interface CalendarEvent {
  id: string;
  user_id: string;
  date: string; // ISO date
  label: string;
  time: string | null; // "HH:MM", optional
  position: number; // manual order among same-day events, used when no time (or a tie) breaks the sort
}

export const DASHBOARD_WIDGET_IDS = [
  'kpis',
  'this-week',
  'priorities',
  'todos',
  'calendar',
  'agenda',
  'notes',
  'net-worth-trend',
  'spending-breakdown',
] as const;
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardWidgetSize = 'full' | 'half';

/** Sensible default layout: the KPI grid and the notes board get a full row, everything else pairs up. */
export const DEFAULT_WIDGET_SIZE: Record<DashboardWidgetId, DashboardWidgetSize> = {
  kpis: 'full',
  'this-week': 'half',
  priorities: 'half',
  todos: 'half',
  calendar: 'half',
  agenda: 'half',
  notes: 'full',
  'net-worth-trend': 'half',
  'spending-breakdown': 'half',
};

export type DashboardLayoutMode = 'wrap' | 'scroll';

export interface UserSettings {
  id: string;
  user_id: string;
  accent_color: string | null; // hex; null = default theme color
  avatar_data_url: string | null;
  display_name: string | null;
  font_preset: string | null; // id from FONT_PRESETS; null = default
  nav_order: string[] | null; // ordered list of route paths; null = default order
  dashboard_widget_order: DashboardWidgetId[] | null; // null = default order
  dashboard_widget_visibility: Partial<Record<DashboardWidgetId, boolean>> | null; // missing key = visible
  dashboard_widget_size: Partial<Record<DashboardWidgetId, DashboardWidgetSize>> | null; // missing key = DEFAULT_WIDGET_SIZE
  dashboard_layout_mode: DashboardLayoutMode | null; // null = 'wrap'
}
