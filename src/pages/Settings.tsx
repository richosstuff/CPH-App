import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { UserSettings, DashboardWidgetId, DashboardWidgetSize } from '../lib/types';
import { DASHBOARD_WIDGET_IDS, DEFAULT_WIDGET_SIZE } from '../lib/types';
import { orderNavItems } from '../lib/navConfig';
import { reorder } from '../lib/dragReorder';
import { applyAccentColor } from '../lib/colorUtils';
import { fileToAvatarDataUrl } from '../lib/imageUtils';
import { FONT_PRESETS, applyFontPreset } from '../lib/fontPresets';
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
  display_name: null,
  font_preset: null,
  nav_order: null,
  dashboard_widget_order: null,
  dashboard_widget_visibility: null,
  dashboard_widget_size: null,
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
          display_name: merged.display_name,
          font_preset: merged.font_preset,
          nav_order: merged.nav_order,
          dashboard_widget_order: merged.dashboard_widget_order,
          dashboard_widget_visibility: merged.dashboard_widget_visibility,
          dashboard_widget_size: merged.dashboard_widget_size,
          id: settings.id || undefined,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();
    if (data) setSettings(data);
    if ('accent_color' in patch) applyAccentColor(patch.accent_color ?? null);
    if ('font_preset' in patch) applyFontPreset(patch.font_preset ?? null);
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
              {(settings.display_name || user?.email || '?')[0].toUpperCase()}
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

        <label className="block mb-5 max-w-xs">
          <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Display name</span>
          <input
            value={settings.display_name ?? ''}
            onChange={(e) => void save({ display_name: e.target.value || null })}
            placeholder={user?.email ?? ''}
            className="w-full border border-line rounded-sm px-2 py-1.5 text-sm outline-none focus:border-harbor"
          />
          <span className="block text-xs text-ink-soft mt-1">Shown next to your photo in the top corner.</span>
        </label>

        <div className="flex items-center gap-3 mb-5">
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

        <div>
          <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1.5">Typeface</span>
          <div className="flex flex-wrap gap-2">
            {FONT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => void save({ font_preset: preset.id === 'editorial' ? null : preset.id })}
                style={{ fontFamily: preset.display }}
                className={`px-3 py-1.5 rounded-sm text-sm border ${
                  (settings.font_preset ?? 'editorial') === preset.id
                    ? 'border-harbor bg-harbor/10 text-harbor-dark'
                    : 'border-line text-ink-soft hover:border-harbor'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
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
            const size = settings.dashboard_widget_size?.[id] ?? DEFAULT_WIDGET_SIZE[id];
            return (
              <div key={id} className="flex items-center justify-between py-1.5">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
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
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {(['half', 'full'] as DashboardWidgetSize[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => void save({ dashboard_widget_size: { ...settings.dashboard_widget_size, [id]: s } })}
                      className={`px-2 py-0.5 rounded-sm ${
                        size === s ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'
                      }`}
                    >
                      {s === 'half' ? 'Half' : 'Full'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
