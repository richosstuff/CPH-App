import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserSettings } from '../lib/types';
import { orderNavItems } from '../lib/navConfig';
import { applyAccentColor } from '../lib/colorUtils';
import { applyFontPreset } from '../lib/fontPresets';
import SearchBar from './SearchBar';
import Logo from './Logo';

export default function Layout() {
  const { signOut, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Sidebar is an off-canvas drawer below md; close it whenever the route changes
  // so tapping a nav link on mobile doesn't leave it hanging open over the page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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
        applyFontPreset(data?.font_preset ?? null);
      });
  }, [user, location.pathname]);

  const nav = orderNavItems(settings?.nav_order);

  return (
    <div className="min-h-screen bg-paper flex">
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-paper border-r border-line flex flex-col justify-between px-4 pt-[calc(1.5rem_+_env(safe-area-inset-top))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] transition-transform duration-200 ease-out ${
          drawerOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } md:sticky md:top-0 md:h-screen md:z-auto md:w-56 md:translate-x-0 md:shadow-none`}
      >
        <div>
          <div className="flex items-center justify-center py-5 mb-6 border-b border-line">
            <Logo variant="icon" className="w-14 h-14" />
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
                      `flex items-center gap-2.5 rounded-sm px-3 py-2.5 md:py-2 text-sm transition-colors ${
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

      <main
        className="flex-1 min-w-0 px-4 md:px-8 max-w-7xl pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] md:pb-[calc(2rem_+_env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-30 bg-paper flex items-center justify-between gap-3 md:gap-4 pt-[calc(1.5rem_+_env(safe-area-inset-top))] md:pt-[calc(2rem_+_env(safe-area-inset-top))] pb-4 mb-6 border-b border-line">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="md:hidden shrink-0 p-1.5 -ml-1.5 text-ink-soft hover:text-ink"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <Logo variant="icon" className="md:hidden w-6 h-6 shrink-0" />
          <SearchBar />
          <Link to="/settings" aria-label="Settings" className="flex items-center gap-2.5 shrink-0 group">
            {settings?.display_name && (
              <span className="hidden sm:inline text-sm font-bold text-harbor group-hover:text-harbor-dark transition-colors">
                {settings.display_name}
              </span>
            )}
            {settings?.avatar_data_url ? (
              <img
                src={settings.avatar_data_url}
                alt=""
                className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover border border-line group-hover:border-harbor transition-colors"
              />
            ) : (
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-paper-dim border border-line group-hover:border-harbor transition-colors flex items-center justify-center font-mono text-base text-ink-soft">
                {(settings?.display_name || user?.email || '?')[0].toUpperCase()}
              </div>
            )}
          </Link>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
