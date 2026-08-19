import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Application, ApplicationStatus } from '../lib/types';
import { Plus, Trash2 } from 'lucide-react';

const STATUSES: ApplicationStatus[] = ['Not applied', 'Applied/Assessment', 'Interview', 'Offer', 'Rejected'];

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  'Not applied': 'bg-paper-dim text-ink-soft',
  'Applied/Assessment': 'bg-[#b8860b] text-white',
  Interview: 'bg-[#3b6fa8] text-white',
  Offer: 'bg-moss text-white',
  Rejected: 'bg-rust text-white',
};

// Rows saved before the Applied/Assessment merge may still hold the old raw values —
// treat them the same rather than showing a blank/uncolored select.
function normalizeStatus(status: string): ApplicationStatus {
  if (status === 'Applied' || status === 'Assessment') return 'Applied/Assessment';
  return STATUSES.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : 'Not applied';
}

export default function Jobs() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('applications').select('*').eq('user_id', user!.id);
    setApplications(data ?? []);
    setLoading(false);
  }

  async function update(id: string, patch: Partial<Application>) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await supabase.from('applications').update(patch).eq('id', id);
  }

  async function addRow() {
    const { data } = await supabase
      .from('applications')
      .insert({ user_id: user!.id, company: 'New company', role: 'Role', status: 'Not applied' })
      .select()
      .single();
    if (data) setApplications((prev) => [...prev, data]);
  }

  async function removeRow(id: string) {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    await supabase.from('applications').delete().eq('id', id);
  }

  const sorted = [...applications].sort(
    (a, b) => STATUSES.indexOf(normalizeStatus(a.status)) - STATUSES.indexOf(normalizeStatus(b.status))
  );

  const openCount = applications.filter((a) => !['Rejected', 'Offer'].includes(a.status)).length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-3xl">Job Search</h1>
        <span className="font-mono text-xs text-ink-soft">
          {applications.length} total · {openCount} open
        </span>
      </div>
      <p className="text-ink-soft mb-6 text-sm">Every application in one table instead of a mental list.</p>

      {loading ? (
        <p className="text-ink-soft">Loading…</p>
      ) : (
        <div className="border border-line rounded-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-dim/50 text-left">
                <th className="font-medium px-4 py-2">Company</th>
                <th className="font-medium px-4 py-2">Role</th>
                <th className="font-medium px-4 py-2 w-36">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((app) => {
                const status = normalizeStatus(app.status);
                return (
                <tr key={app.id} className="border-b border-line last:border-0 group">
                  <td className="px-2 py-1.5">
                    <input
                      value={app.company}
                      onChange={(e) => update(app.id, { company: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={app.role}
                      onChange={(e) => update(app.id, { role: e.target.value })}
                      className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={status}
                      onChange={(e) => update(app.id, { status: e.target.value as ApplicationStatus })}
                      className={`w-full px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${STATUS_STYLE[status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => void removeRow(app.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1.5"
                      aria-label={`Remove ${app.company}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <button
            onClick={() => void addRow()}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add application
          </button>
        </div>
      )}
    </div>
  );
}
