import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, FileText, Upload, Settings, LogOut } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import AskPage from './pages/AskPage';
import FeedPage from './pages/FeedPage';
import IngestPage from './pages/IngestPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import './index.css';

const WORKSPACE_ITEMS = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'ask', label: 'Ask Anything', icon: MessageSquare },
  { key: 'feed', label: 'Documents', icon: FileText, badge: '0' },
];

const INTEGRATION_ITEMS = [
  { key: 'ingest', label: 'Ingest Data', icon: Upload },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'app'
  const [authLoading, setAuthLoading] = useState(true);

  // On mount: check for persisted session
  useEffect(() => {
    const savedToken = localStorage.getItem('trace_token');
    const savedUser = localStorage.getItem('trace_user');

    if (savedToken && savedUser) {
      // Validate token with backend
      fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Token expired');
        })
        .then((data) => {
          setUser(data.user);
          setToken(savedToken);
          setView('app');
        })
        .catch(() => {
          localStorage.removeItem('trace_token');
          localStorage.removeItem('trace_user');
          setView('landing');
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    setView('app');
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('trace_token');
    localStorage.removeItem('trace_user');
    setView('landing');
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage setPage={setPage} />;
      case 'ask': return <AskPage />;
      case 'feed': return <FeedPage />;
      case 'ingest': return <IngestPage />;
      case 'settings': return <SettingsPage theme={theme} setTheme={setTheme} />;
      default: return <DashboardPage setPage={setPage} />;
    }
  };

  // Loading spinner while verifying token
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Verifying session...</span>
      </div>
    );
  }

  // Auth gateway
  if (view === 'landing') {
    return <LandingPage onNavigate={setView} />;
  }

  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} onNavigate={setView} />;
  }

  // Extract user initials
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const userName = user?.name || 'User';
  const userRole = user?.role === 'admin' ? 'Administrator' : 'Member';

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-mark">~</div>
            <div className="logo-text">Trace.AI</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">WORKSPACE</div>
          {WORKSPACE_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
              id={`nav-${item.key}`}
            >
              <item.icon className="nav-icon" size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize: 10, background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 10, color: 'var(--text-secondary)' }}>{item.badge}</span>}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: 12 }}>INTEGRATIONS</div>
          {INTEGRATION_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
              id={`nav-${item.key}`}
            >
              <item.icon className="nav-icon" size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{userInitial}</div>
              <div className="user-info">
                <span className="user-name" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{userName}</span>
                <span className="user-role" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{userRole}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
              onMouseEnter={(e) => e.target.style.color = 'var(--gmail)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
