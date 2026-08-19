import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { UserSettings, DashboardWidgetId } from '../lib/types';
import { DASHBOARD_WIDGET_IDS } from '../lib/types';
import { orderNavItems } from '../lib/navConfig';
import { reorder } from '../lib/dragReorder';
import { applyAccentColor } from '../lib/colorUtils';
import { fileToAvatarDataUrl } from '../lib/imageUtils';
import { GripVertical } from 'lucide-react';

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  kpis: 'Life KPIs',
  'this-week': 'This week (habits)',
  priorities: 'Top 3 priorities',
  todos: 'To-Do',
  calendar: 'Calendar',
  notes: 'Notes',
  'net-worth-trend': 'Net worth trend',
  'spending-breakdown': 'Spending breakdown',
};

const EMPTY_SETTINGS: UserSettings = {
  id: '',
  user_id: '',
  accent_color: null,
  avatar_data_url: null,
  nav_order: null,
  dashboard_widget_order: null,
  dashboard_widget_visibility: null,
};

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [navDragIndex, setNavDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user!.id).maybeSingle();
    setSettings(data ?? { ...EMPTY_SETTINGS, user_id: user!.id });
    setLoading(false);
  }

  async function save(patch: Partial<UserSettings>) {
    const merged = { ...settings, ...patch };
    setSettings(merged);
    const { data } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user!.id,
          accent_color: merged.accent_color,
          avatar_data_url: merged.avatar_data_url,
          nav_order: merged.nav_order,
          dashboard_widget_order: merged.dashboard_widget_order,
          dashboard_widget_visibility: merged.dashboard_widget_visibility,
          id: settings.id || undefined,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();
    if (data) setSettings(data);
    if ('accent_color' in patch) applyAccentColor(patch.accent_color ?? null);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await save({ avatar_data_url: dataUrl });
    } catch {
      // unreadable file — leave the existing avatar in place
    }
    e.target.value = '';
  }

  const orderedNav = orderNavItems(settings.nav_order);

  function handleNavDrop(index: number) {
    if (navDragIndex === null || navDragIndex === index) {
      setNavDragIndex(null);
      return;
    }
    const newOrder = reorder(orderedNav, navDragIndex, index).map((item) => item.to);
    void save({ nav_order: newOrder });
    setNavDragIndex(null);
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Settings</h1>
      <p className="text-ink-soft mb-6 text-sm">How the app looks and lays itself out, just for you.</p>

      <div className="border border-line rounded-sm bg-white p-5 mb-6">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-4">Appearance</h2>

        <div className="flex items-center gap-4 mb-5">
          {settings.avatar_data_url ? (
            <img src={settings.avatar_data_url} alt="" className="w-16 h-16 rounded-full object-cover border border-line" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-paper-dim border border-line flex items-center justify-center font-mono text-lg text-ink-soft">
              {(user?.email ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <label className="inline-block px-3 py-1.5 rounded-sm text-sm text-harbor border border-harbor hover:bg-harbor/10 cursor-pointer">
              Upload photo
              <input type="file" accept="image/*" onChange={(e) => void handleAvatarChange(e)} className="hidden" />
            </label>
            {settings.avatar_data_url && (
              <button
                onClick={() => void save({ avatar_data_url: null })}
                className="ml-2 text-xs text-ink-soft hover:text-rust"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.accent_color ?? '#2d6e7e'}
            onChange={(e) => void save({ accent_color: e.target.value })}
            className="w-9 h-9 rounded-sm border border-line cursor-pointer bg-transparent p-0.5"
          />
          <span className="text-sm text-ink-soft">Main site color</span>
          {settings.accent_color && (
            <button onClick={() => void save({ accent_color: null })} className="text-xs text-ink-soft hover:text-rust">
              Reset to default
            </button>
          )}
        </div>
      </div>

      <div className="border border-line rounded-sm bg-white p-5 mb-6">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Sidebar order</h2>
        <p className="text-xs text-ink-soft mb-3">Drag to reorder.</p>
        <div>
          {orderedNav.map((item, i) => (
            <div
              key={item.to}
              draggable
              onDragStart={() => setNavDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleNavDrop(i)}
              onDragEnd={() => setNavDragIndex(null)}
              className={`flex items-center gap-2 px-2 py-1.5 border-b border-line last:border-0 text-sm ${
                navDragIndex === i ? 'opacity-40' : ''
              }`}
            >
              <span className="cursor-grab text-ink-soft/50 hover:text-ink-soft shrink-0">
                <GripVertical className="w-4 h-4" />
              </span>
              <item.icon className="w-3.5 h-3.5 text-ink-soft shrink-0" strokeWidth={1.75} />
              {item.label}
            </div>
          ))}
        </div>
        {settings.nav_order && (
          <button onClick={() => void save({ nav_order: null })} className="mt-3 text-xs text-ink-soft hover:text-rust">
            Reset to default order
          </button>
        )}
      </div>

      <div className="border border-line rounded-sm bg-white p-5">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Dashboard widgets</h2>
        <p className="text-xs text-ink-soft mb-3">Show or hide — drag to reorder them directly on the Dashboard.</p>
        <div>
          {DASHBOARD_WIDGET_IDS.map((id) => {
            const visible = settings.dashboard_widget_visibility?.[id] !== false;
            return (
              <label key={id} className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) =>
                    void save({
                      dashboard_widget_visibility: { ...settings.dashboard_widget_visibility, [id]: e.target.checked },
                    })
                  }
                  className="accent-harbor w-4 h-4"
                />
                {WIDGET_LABELS[id]}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
