import { useState } from 'react';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLogin, onNavigate }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' ? { name, email, password } : { email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('trace_token', data.token);
      localStorage.setItem('trace_user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background */}
      <div className="landing-bg">
        <div className="bg-gradient bg-gradient-1" />
        <div className="bg-gradient bg-gradient-2" />
        <div className="bg-grid" />
      </div>

      <div className="auth-card">
        {/* Left brand panel */}
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
              <div className="logo-mark" style={{ width: 36, height: 36, fontSize: 18 }}>~</div>
              <span style={{ fontWeight: 800, fontSize: 22 }}>Trace.AI</span>
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-1px', marginBottom: 16 }}>
              Your organization's<br />
              <span className="landing-title-accent">intelligence layer.</span>
            </h2>

            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Query across Gmail, Slack, docs, and transcripts with AI-powered reasoning.
              Every answer comes with full source citations.
            </p>

            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '🔒', text: 'JWT-secured authentication' },
                { icon: '🎓', text: 'Exclusive to @walchandsangli.ac.in' },
                { icon: '⚡', text: 'AI-powered knowledge extraction' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700 }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
                {mode === 'login'
                  ? 'Sign in with your Walchand email to continue'
                  : 'Register with your @walchandsangli.ac.in email'}
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'register' && (
                <div className="auth-field">
                  <label className="auth-label"><User size={14} /> Full Name</label>
                  <input className="auth-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pratap Dabhade" required />
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label"><Mail size={14} /> Email</label>
                <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pratap.dabhade@walchandsangli.ac.in" required />
              </div>

              <div className="auth-field">
                <label className="auth-label"><Lock size={14} /> Password</label>
                <div className="auth-input-wrap">
                  <input className="auth-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} style={{ paddingRight: 44 }} />
                  <button type="button" className="auth-toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? (
                  <div className="spinner" style={{ width: 18, height: 18 }} />
                ) : (
                  <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="auth-switch">
              {mode === 'login' ? (
                <p>Don't have an account? <button onClick={() => { setMode('register'); setError(''); }}>Register</button></p>
              ) : (
                <p>Already have an account? <button onClick={() => { setMode('login'); setError(''); }}>Sign In</button></p>
              )}
            </div>

            <button className="auth-back" onClick={() => onNavigate('landing')}>
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
