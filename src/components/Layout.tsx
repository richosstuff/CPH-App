import { NavLink, Outlet } from 'react-router-dom';
import { Compass, LayoutDashboard, Users, CheckSquare, Briefcase, Wallet, Target, Utensils, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/network', label: 'Network', icon: Users },
  { to: '/habits', label: 'Habits', icon: CheckSquare },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/meals', label: 'Meals', icon: Utensils },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
];

export default function Layout() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="w-56 shrink-0 border-r border-line flex flex-col justify-between py-6 px-4">
        <div>
          <div className="flex items-center gap-2 px-2 mb-8">
            <Compass className="w-5 h-5 text-harbor" strokeWidth={1.5} />
            <span className="font-display text-lg leading-none">Copenhagen<br />Chapter</span>
          </div>

          <nav className="relative pl-3">
            <div className="absolute left-0 top-1 bottom-1 w-px rail-line" />
            <ul className="space-y-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-harbor text-white'
                          : 'text-ink-soft hover:bg-paper-dim hover:text-ink'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="px-2">
          <p className="font-mono text-[11px] text-ink-soft truncate mb-2">{user?.email}</p>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 text-sm text-ink-soft hover:text-rust transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8 max-w-5xl">
        <Outlet />
      </main>
    </div>
  );
}
