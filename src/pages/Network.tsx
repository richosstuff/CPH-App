import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Contact, ContactCategory } from '../lib/types';
import { daysSince } from '../lib/dateUtils';
import { Plus, Trash2, Flag } from 'lucide-react';

const CATEGORIES: ContactCategory[] = ['DTU', 'Work', 'Sport', 'Social', 'Other'];
const FILTERS: ('All' | ContactCategory)[] = ['All', ...CATEGORIES];
const STALE_DAYS = 30;

const CATEGORY_STYLE: Record<ContactCategory, string> = {
  DTU: 'bg-harbor/10 text-harbor-dark',
  Work: 'bg-ink/10 text-ink',
  Sport: 'bg-moss/10 text-moss',
  Social: 'bg-rust/10 text-rust',
  Other: 'bg-paper-dim text-ink-soft',
};

function isStale(contact: Contact): boolean {
  return contact.last_interaction_date == null || daysSince(contact.last_interaction_date) >= STALE_DAYS;
}

export default function Network() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'All' | ContactCategory>('All');
  const [sortBy, setSortBy] = useState<'last_interaction_date' | 'name'>('last_interaction_date');

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('network_contacts').select('*').eq('user_id', user!.id);
    setContacts(data ?? []);
    setLoading(false);
  }

  async function update(id: string, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase.from('network_contacts').update(patch).eq('id', id);
  }

  async function addRow() {
    const { data } = await supabase
      .from('network_contacts')
      .insert({ user_id: user!.id, name: 'New contact', category: 'Other', follow_up: false })
      .select()
      .single();
    if (data) setContacts((prev) => [...prev, data]);
  }

  async function removeRow(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('network_contacts').delete().eq('id', id);
  }

  const filtered = useMemo(
    () => (categoryFilter === 'All' ? contacts : contacts.filter((c) => c.category === categoryFilter)),
    [contacts, categoryFilter]
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (a.last_interaction_date ?? '0000-00-00').localeCompare(b.last_interaction_date ?? '0000-00-00');
      }),
    [filtered, sortBy]
  );

  const staleCount = contacts.filter(isStale).length;
  const followUpCount = contacts.filter((c) => c.follow_up).length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-3xl">Network</h1>
        <span className="font-mono text-xs text-ink-soft">
          {contacts.length} total · {staleCount} stale · {followUpCount} follow-up
        </span>
      </div>
      <p className="text-ink-soft mb-6 text-sm">
        Every person worth remembering in Copenhagen — where you met, and when you last reached out.
      </p>

      <div className="flex items-center gap-2 mb-3 font-mono text-xs flex-wrap">
        <span className="text-ink-soft">Filter</span>
        {FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-2 py-1 rounded-sm ${
              categoryFilter === cat ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3 font-mono text-xs">
        <span className="text-ink-soft">Sort by</span>
        {(['last_interaction_date', 'name'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-2 py-1 rounded-sm ${
              sortBy === key ? 'bg-harbor text-white' : 'text-ink-soft hover:bg-paper-dim'
            }`}
          >
            {key === 'last_interaction_date' ? 'Last interaction' : 'Name'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-soft">Loading…</p>
      ) : (
        <div className="border border-line rounded-sm overflow-hidden bg-white">
          {contacts.length === 0 && (
            <p className="text-sm text-ink-soft px-4 py-3 border-b border-line bg-paper-dim/30">
              No contacts yet — add the first person you meet.
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-dim/50 text-left">
                <th className="font-medium px-4 py-2">Name</th>
                <th className="font-medium px-4 py-2 w-28">Category</th>
                <th className="font-medium px-4 py-2">Met where</th>
                <th className="font-medium px-4 py-2 w-32">Met</th>
                <th className="font-medium px-4 py-2 w-36">Last interaction</th>
                <th className="font-medium px-2 py-2 w-10 text-center">
                  <span className="sr-only">Follow-up</span>
                  <Flag className="w-3.5 h-3.5 mx-auto text-ink-soft" />
                </th>
                <th className="font-medium px-4 py-2">Notes</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((contact) => {
                const stale = isStale(contact);
                return (
                  <tr key={contact.id} className="border-b border-line last:border-0 group">
                    <td className="px-2 py-1.5">
                      <input
                        value={contact.name}
                        onChange={(e) => update(contact.id, { name: e.target.value })}
                        className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={contact.category}
                        onChange={(e) => update(contact.id, { category: e.target.value as ContactCategory })}
                        className={`w-full px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${CATEGORY_STYLE[contact.category]}`}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={contact.met_where ?? ''}
                        onChange={(e) => update(contact.id, { met_where: e.target.value || null })}
                        placeholder="Where/how you met"
                        className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={contact.met_date ?? ''}
                        onChange={(e) => update(contact.id, { met_date: e.target.value || null })}
                        className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${stale ? 'bg-rust' : 'bg-moss'}`}
                          title={stale ? `${STALE_DAYS}+ days since last interaction` : 'Recently in touch'}
                        />
                        <input
                          type="date"
                          value={contact.last_interaction_date ?? ''}
                          onChange={(e) => update(contact.id, { last_interaction_date: e.target.value || null })}
                          className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                        />
                      </div>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => void update(contact.id, { follow_up: !contact.follow_up })}
                        className={`p-1.5 rounded-sm ${contact.follow_up ? 'text-rust' : 'text-ink-soft hover:text-rust'}`}
                        aria-label={`Toggle follow-up for ${contact.name}`}
                      >
                        <Flag className="w-3.5 h-3.5" fill={contact.follow_up ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={contact.notes ?? ''}
                        onChange={(e) => update(contact.id, { notes: e.target.value || null })}
                        placeholder="Notes"
                        className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => void removeRow(contact.id)}
                        className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1.5"
                        aria-label={`Remove ${contact.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            onClick={() => void addRow()}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add contact
          </button>
        </div>
      )}
    </div>
  );
}
