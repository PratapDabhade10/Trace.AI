import { Sun, Moon, Monitor } from 'lucide-react';

export default function SettingsPage({ theme, setTheme }) {
  const THEME_OPTIONS = [
    { id: 'light', label: 'Light Mode', icon: <Sun size={18} />, desc: 'Clean, stark white interface' },
    { id: 'dark', label: 'Dark Mode', icon: <Moon size={18} />, desc: 'High-contrast dark interface' },
    { id: 'system', label: 'System Default', icon: <Monitor size={18} />, desc: 'Follows your operating system' }
  ];

  return (
    <>
      <div className="page-header" style={{ padding: '24px 32px' }}>
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Manage preferences and system integrations</div>
      </div>
      
      <div className="page-body">
        <div style={{ maxWidth: 800 }}>
          {/* Theme Section */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Appearance</span>
            </div>
            <div className="card-body">
              <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'block' }}>Interface Theme</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {THEME_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    style={{
                      border: theme === opt.id ? '2px solid var(--accent-dark)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                      background: 'var(--bg-primary)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      color: theme === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: 'var(--bg-tertiary)',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {opt.icon}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{opt.desc}</div>
                    </div>
                    {theme === opt.id && (
                      <div style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-dark)'
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
