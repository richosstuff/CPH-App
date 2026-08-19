import type { ExpenseCategory, IncomeCategory } from './types';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food & Groceries',
  'Housing',
  'Transport',
  'Education & Books',
  'Sport & Gym',
  'Going Out',
  'Travel',
  'Subscriptions',
  'Other',
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Food & Groceries': '#5f8863',
  Housing: '#2d6e7e',
  Transport: '#204f5b',
  'Education & Books': '#6b5b95',
  'Sport & Gym': '#b4622e',
  'Going Out': '#c9974f',
  Travel: '#4a90a4',
  Subscriptions: '#4b5a63',
  Other: '#9aa39e',
};

export const INCOME_CATEGORIES: IncomeCategory[] = ['Salary', 'SU (Student Grant)', 'Freelance', 'Gift', 'Other'];

export const INCOME_CATEGORY_COLORS: Record<IncomeCategory, string> = {
  Salary: '#5f8863',
  'SU (Student Grant)': '#2d6e7e',
  Freelance: '#c9974f',
  Gift: '#6b5b95',
  Other: '#9aa39e',
};
