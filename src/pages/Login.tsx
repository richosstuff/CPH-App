import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === 'sign-up') {
      setNotice('Account created. Check your inbox to confirm your email, then sign in.');
      setMode('sign-in');
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Logo variant="icon" className="w-5 h-5" />
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-ink-soft">
            Copenhagen Chapter
          </span>
        </div>

        <div className="border border-line bg-white/60 rounded-sm p-8">
          <h1 className="font-display text-2xl mb-1">
            {mode === 'sign-in' ? 'Welcome back' : 'Set up your log'}
          </h1>
          <p className="text-sm text-ink-soft mb-6">
            {mode === 'sign-in'
              ? 'This is a private, single-user log — sign in to continue.'
              : 'This creates your own private copy of the dashboard.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2 bg-white focus:border-harbor outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2 bg-white focus:border-harbor outline-none"
              />
            </div>

            {error && <p className="text-sm text-rust">{error}</p>}
            {notice && <p className="text-sm text-moss">{notice}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-harbor text-white rounded-sm py-2 font-medium hover:bg-harbor-dark transition-colors disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setError(null);
              setNotice(null);
            }}
            className="w-full text-center text-sm text-ink-soft mt-4 hover:text-harbor transition-colors"
          >
            {mode === 'sign-in' ? "First time here? Create your log" : 'Already have a log? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
