import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, X } from 'lucide-react';

interface ResultItem {
  label: string;
  sublabel: string;
  to: string;
}

type ResultGroups = Record<string, ResultItem[]>;

export default function SearchBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultGroups>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults({});
      setLoading(false);
      return;
    }
    const term = `%${query.trim()}%`;
    setLoading(true);
    const timer = setTimeout(() => {
      void Promise.all([
        supabase.from('network_contacts').select('id,name').eq('user_id', user.id).ilike('name', term).limit(5),
        supabase
          .from('applications')
          .select('id,company,role')
          .eq('user_id', user.id)
          .or(`company.ilike.${term},role.ilike.${term}`)
          .limit(5),
        supabase.from('todos').select('id,text').eq('user_id', user.id).ilike('text', term).limit(5),
        supabase.from('life_goals').select('id,dream,domain').eq('user_id', user.id).ilike('dream', term).limit(5),
        supabase.from('notes').select('id,text').eq('user_id', user.id).ilike('text', term).limit(5),
        supabase
          .from('transactions')
          .select('id,description,label')
          .eq('user_id', user.id)
          .or(`description.ilike.${term},label.ilike.${term}`)
          .limit(5),
        supabase.from('schedule_blocks').select('id,title').eq('user_id', user.id).ilike('title', term).limit(5),
        supabase.from('calendar_events').select('id,label,date').eq('user_id', user.id).ilike('label', term).limit(5),
      ]).then(([contacts, apps, todos, goals, notes, txns, blocks, events]) => {
        setResults({
          Network: (contacts.data ?? []).map((c) => ({ label: c.name, sublabel: 'Contact', to: '/network' })),
          Jobs: (apps.data ?? []).map((a) => ({ label: a.company, sublabel: a.role, to: '/jobs' })),
          'To-Do': (todos.data ?? []).map((t) => ({ label: t.text, sublabel: 'To-do', to: '/todos' })),
          Goals: (goals.data ?? []).map((g) => ({ label: g.dream, sublabel: g.domain, to: '/goals' })),
          Notes: (notes.data ?? []).map((n) => ({ label: n.text || 'Untitled note', sublabel: 'Note', to: '/' })),
          Finance: (txns.data ?? []).map((t) => ({ label: t.description, sublabel: t.label ?? 'Transaction', to: '/finance' })),
          Schedule: (blocks.data ?? []).map((b) => ({ label: b.title, sublabel: 'Schedule', to: '/schedule' })),
          Calendar: (events.data ?? []).map((e) => ({ label: e.label, sublabel: e.date, to: '/calendar' })),
        });
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, user]);

  const hasResults = Object.values(results).some((r) => r.length > 0);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-soft pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search everything…"
        className="w-full pl-8 pr-7 py-1.5 border border-line rounded-sm bg-white text-sm outline-none focus:border-harbor"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            setResults({});
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1 border border-line rounded-sm bg-white shadow-lg max-h-96 overflow-y-auto z-20">
          {loading && <p className="px-3 py-2 text-xs text-ink-soft">Searching…</p>}
          {!loading && !hasResults && <p className="px-3 py-2 text-xs text-ink-soft">No matches.</p>}
          {!loading &&
            Object.entries(results).map(
              ([group, items]) =>
                items.length > 0 && (
                  <div key={group}>
                    <p className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-wide text-ink-soft">{group}</p>
                    {items.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigate(r.to);
                          setOpen(false);
                          setQuery('');
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-paper-dim/60 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{r.label}</span>
                        <span className="text-xs text-ink-soft shrink-0">{r.sublabel}</span>
                      </button>
                    ))}
                  </div>
                )
            )}
        </div>
      )}
    </div>
  );
}
