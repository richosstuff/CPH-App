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

export type ApplicationStatus =
  | 'Not applied'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected';

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
  progress_pct: number;
  linked_financial_goal_id: string | null;
  status: LifeGoalStatus;
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
