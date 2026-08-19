import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Compass, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserSettings } from '../lib/types';
import { orderNavItems } from '../lib/navConfig';
import { applyAccentColor } from '../lib/colorUtils';

export default function Layout() {
  const { signOut, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const location = useLocation();

  // Layout stays mounted across every in-app navigation (only the routed page
  // remounts), so Settings changes wouldn't otherwise show up here until a hard
  // refresh. Re-fetching on every path change picks them up as soon as you
  // navigate away from Settings.
  useEffect(() => {
    if (!user) return;
    void supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data ?? null);
        applyAccentColor(data?.accent_color ?? null);
      });
  }, [user, location.pathname]);

  const nav = orderNavItems(settings?.nav_order);

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="w-56 shrink-0 border-r border-line flex flex-col justify-between py-6 px-4">
        <div>
          <div className="flex items-center px-2 mb-8">
            <Compass className="w-6 h-6 text-harbor" strokeWidth={1.5} />
          </div>

          <nav className="relative pl-3">
            <div className="absolute left-0 top-1 bottom-1 w-px rail-line" />
            <ul className="space-y-1">
              {nav.map(({ to, label, icon: Icon, end }) => (
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
        <div className="flex justify-end mb-4">
          <Link to="/settings" aria-label="Settings">
            {settings?.avatar_data_url ? (
              <img
                src={settings.avatar_data_url}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-line hover:border-harbor transition-colors"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-paper-dim border border-line hover:border-harbor transition-colors flex items-center justify-center font-mono text-xs text-ink-soft">
                {(user?.email ?? '?')[0].toUpperCase()}
              </div>
            )}
          </Link>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
