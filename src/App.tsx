import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Network from './pages/Network';
import Habits from './pages/Habits';
import Jobs from './pages/Jobs';
import Finance from './pages/Finance';
import Goals from './pages/Goals';
import Todos from './pages/Todos';
import CalendarPage from './pages/Calendar';
import Settings from './pages/Settings';
import Meals from './pages/Meals';
import Schedule from './pages/Schedule';

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="font-mono text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/network" element={<Network />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
