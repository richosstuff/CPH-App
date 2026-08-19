import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Asset, Liability, ExchangeRate, AssetType, Currency } from '../../lib/types';
import { todayISO } from '../../lib/dateUtils';
import { toDkk, formatDkk } from '../../lib/currency';
import { Plus, Trash2 } from 'lucide-react';

const ASSET_TYPES: AssetType[] = ['Bank account', 'ETF or Index fund', 'Crypto', 'Cash', 'Other'];
const CURRENCIES: Currency[] = ['DKK', 'EUR', 'GBP', 'USD', 'SEK'];

const TYPE_STYLE: Record<AssetType, string> = {
  'Bank account': 'bg-harbor/10 text-harbor-dark',
  'ETF or Index fund': 'bg-moss/10 text-moss',
  Crypto: 'bg-[#c9974f]/10 text-[#c9974f]',
  Cash: 'bg-paper-dim text-ink-soft',
  Other: 'bg-ink/10 text-ink',
};

export default function Portfolio() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: assetData }, { data: liabData }, { data: rateData }] = await Promise.all([
      supabase.from('assets').select('*').eq('user_id', user!.id),
      supabase.from('liabilities').select('*').eq('user_id', user!.id),
      supabase.from('exchange_rates').select('*').eq('user_id', user!.id),
    ]);
    setAssets(assetData ?? []);
    setLiabilities(liabData ?? []);
    setRates(rateData ?? []);
    setLoading(false);
  }

  async function addAsset() {
    const { data } = await supabase
      .from('assets')
      .insert({
        user_id: user!.id,
        name: 'New pot',
        type: 'Bank account',
        institution: null,
        currency: 'DKK',
        balance: 0,
        last_updated: todayISO(),
        notes: null,
      })
      .select()
      .single();
    if (data) setAssets((prev) => [...prev, data]);
  }

  async function updateAsset(id: string, patch: Partial<Asset>) {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await supabase.from('assets').update(patch).eq('id', id);
  }

  async function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    await supabase.from('assets').delete().eq('id', id);
  }

  async function addLiability() {
    const { data } = await supabase
      .from('liabilities')
      .insert({ user_id: user!.id, name: 'New debt', amount: 0, currency: 'DKK', last_updated: todayISO() })
      .select()
      .single();
    if (data) setLiabilities((prev) => [...prev, data]);
  }

  async function updateLiability(id: string, patch: Partial<Liability>) {
    setLiabilities((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await supabase.from('liabilities').update(patch).eq('id', id);
  }

  async function removeLiability(id: string) {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
    await supabase.from('liabilities').delete().eq('id', id);
  }

  const totalAssets = assets.reduce((sum, a) => sum + toDkk(a.balance, a.currency, rates), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + toDkk(l.amount, l.currency, rates), 0);
  const netWorth = totalAssets - totalLiabilities;

  if (loading) return <p className="text-ink-soft">Loading…</p>;

  return (
    <div>
      <p className="text-ink-soft mb-4 text-sm">Every pot and holding, what it's for, and what it's worth.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-line rounded-sm bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Net worth</p>
          <p className="font-display text-3xl">
            {formatDkk(netWorth)} <span className="text-sm font-body text-ink-soft">DKK</span>
          </p>
        </div>
        <div className="border border-line rounded-sm bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Total assets</p>
          <p className="font-display text-3xl text-moss">
            {formatDkk(totalAssets)} <span className="text-sm font-body text-ink-soft">DKK</span>
          </p>
        </div>
        <div className="border border-line rounded-sm bg-white p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-1">Total liabilities</p>
          <p className="font-display text-3xl text-rust">
            {formatDkk(totalLiabilities)} <span className="text-sm font-body text-ink-soft">DKK</span>
          </p>
        </div>
      </div>

      <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Pots</h2>
      {assets.length === 0 && (
        <p className="text-sm text-ink-soft mb-4">No pots yet — add your bank accounts, savings, and investments below.</p>
      )}
      <div className="space-y-4 mb-4">
        {assets.map((a) => (
          <div key={a.id} className="border border-line rounded-sm bg-white p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <input
                value={a.name}
                onChange={(e) => void updateAsset(a.id, { name: e.target.value })}
                className="font-display text-lg outline-none bg-transparent flex-1 focus:bg-paper-dim/40 rounded-sm px-1 -mx-1"
              />
              <select
                value={a.type}
                onChange={(e) => void updateAsset(a.id, { type: e.target.value as AssetType })}
                className={`shrink-0 px-2 py-1 rounded-sm text-xs font-medium outline-none border-0 ${TYPE_STYLE[a.type]}`}
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
              <label className="block">
                <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Institution</span>
                <input
                  value={a.institution ?? ''}
                  onChange={(e) => void updateAsset(a.id, { institution: e.target.value || null })}
                  placeholder="Danske Bank, Nordnet…"
                  className="w-full border border-line rounded-sm px-2 py-1 text-xs outline-none focus:border-harbor"
                />
              </label>
              <label className="block">
                <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Currency</span>
                <select
                  value={a.currency}
                  onChange={(e) => void updateAsset(a.id, { currency: e.target.value as Currency })}
                  className="w-full border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Balance</span>
                <input
                  type="number"
                  value={a.balance}
                  onChange={(e) => void updateAsset(a.id, { balance: Number(e.target.value) || 0 })}
                  className="w-full border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                />
              </label>
              <label className="block">
                <span className="block font-mono text-[10px] uppercase text-ink-soft mb-1">Updated</span>
                <input
                  type="date"
                  value={a.last_updated ?? ''}
                  onChange={(e) => void updateAsset(a.id, { last_updated: e.target.value || null })}
                  className="w-full border border-line rounded-sm px-2 py-1 font-mono text-xs outline-none focus:border-harbor"
                />
              </label>
            </div>

            <textarea
              value={a.notes ?? ''}
              onChange={(e) => void updateAsset(a.id, { notes: e.target.value || null })}
              onBlur={(e) => void updateAsset(a.id, { notes: e.target.value || null })}
              placeholder="What's this pot for? Strategy, risk level, why it exists…"
              rows={2}
              className="w-full border border-line rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-harbor resize-none mb-2"
            />

            <button
              onClick={() => void removeAsset(a.id)}
              className="flex items-center gap-1.5 text-ink-soft hover:text-rust text-xs"
            >
              <Trash2 className="w-3 h-3" />
              Remove pot
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => void addAsset()}
        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-line border-dashed rounded-sm bg-white text-sm text-ink-soft hover:text-harbor hover:border-harbor w-full mb-6"
      >
        <Plus className="w-3.5 h-3.5" />
        Add pot
      </button>

      <h2 className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">Liabilities</h2>
      <div className="border border-line rounded-sm overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-dim/50 text-left">
              <th className="font-medium px-4 py-2">Name</th>
              <th className="font-medium px-4 py-2 w-28">Amount</th>
              <th className="font-medium px-4 py-2 w-24">Currency</th>
              <th className="font-medium px-4 py-2 w-32">Updated</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {liabilities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-ink-soft text-sm">
                  None — good.
                </td>
              </tr>
            )}
            {liabilities.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 group">
                <td className="px-2 py-1.5">
                  <input
                    value={l.name}
                    onChange={(e) => void updateLiability(l.id, { name: e.target.value })}
                    placeholder="Student loan…"
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={l.amount}
                    onChange={(e) => void updateLiability(l.id, { amount: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={l.currency}
                    onChange={(e) => void updateLiability(l.id, { currency: e.target.value as Currency })}
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={l.last_updated ?? ''}
                    onChange={(e) => void updateLiability(l.id, { last_updated: e.target.value || null })}
                    className="w-full px-2 py-1 bg-transparent outline-none rounded-sm focus:bg-paper-dim/40 font-mono text-xs"
                  />
                </td>
                <td>
                  <button
                    onClick={() => void removeLiability(l.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-rust p-1.5"
                    aria-label={`Remove ${l.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => void addLiability()}
          className="flex items-center gap-2 px-4 py-2.5 border-t border-line bg-paper-dim/30 text-sm text-ink-soft hover:text-harbor w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Add liability
        </button>
      </div>
    </div>
  );
}
