import {
  LayoutDashboard,
  Map as MapIcon,
  Users,
  CheckSquare,
  Briefcase,
  Wallet,
  Target,
  ListTodo,
  CalendarDays,
  Utensils,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Canonical nav list and default order. Settings' drag-to-reorder stores just the `to` paths. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plan', label: 'The Plan', icon: MapIcon },
  { to: '/network', label: 'Network', icon: Users },
  { to: '/habits', label: 'Habits', icon: CheckSquare },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/todos', label: 'To-Do', icon: ListTodo },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/meals', label: 'Meals', icon: Utensils },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
];

/** Applies a stored custom order, appending any items missing from it (e.g. pages added after the order was saved). */
export function orderNavItems(order: string[] | null | undefined): NavItem[] {
  if (!order || order.length === 0) return NAV_ITEMS;
  const byPath = new Map(NAV_ITEMS.map((item) => [item.to, item]));
  const ordered: NavItem[] = [];
  for (const path of order) {
    const item = byPath.get(path);
    if (item) {
      ordered.push(item);
      byPath.delete(path);
    }
  }
  ordered.push(...byPath.values());
  return ordered;
}
