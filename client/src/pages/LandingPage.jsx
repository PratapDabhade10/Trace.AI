import { useState, useEffect } from 'react';
import { ArrowRight, Shield, Zap, Mail, Hash, FileText, Mic, ChevronDown } from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const sources = [
    { icon: <Mail size={20} />, label: 'Gmail', color: '#D93025', bg: 'rgba(217,48,37,0.08)' },
    { icon: <Hash size={20} />, label: 'Slack', color: '#E5A100', bg: 'rgba(229,161,0,0.08)' },
    { icon: <FileText size={20} />, label: 'Docs', color: '#1A73E8', bg: 'rgba(26,115,232,0.08)' },
    { icon: <Mic size={20} />, label: 'Transcripts', color: '#9333EA', bg: 'rgba(147,51,234,0.08)' },
  ];

  return (
    <div className={`landing ${mounted ? 'mounted' : ''}`}>
      {/* Animated background */}
      <div className="landing-bg">
        <div className="bg-gradient bg-gradient-1" />
        <div className="bg-gradient bg-gradient-2" />
        <div className="bg-gradient bg-gradient-3" />
        <div className="bg-grid" />
      </div>

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-left">
          <div className="landing-logo-icon">~</div>
          <span className="landing-logo-text">Trace<span style={{ fontWeight: 300 }}>.AI</span></span>
        </div>
        <div className="landing-nav-right">
          <span className="landing-tag">Walchand College Edition</span>
          <button className="landing-nav-cta" onClick={() => onNavigate('login')}>
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-badge">
          <div className="landing-badge-dot" />
          <span>Organizational Intelligence Engine</span>
        </div>

        <h1 className="landing-title">
          Your Knowledge,<br />
          <span className="landing-title-accent">Unified.</span>
        </h1>

        <p className="landing-desc">
          Connect Gmail, Slack, and Docs. Ask anything.<br />
          Get answers with full source citations instantly.
        </p>

        <div className="landing-actions">
          <button className="landing-cta-main" onClick={() => onNavigate('login')}>
            <Zap size={18} />
            Launch Application
          </button>
          <button className="landing-cta-outline" onClick={() => {
            document.querySelector('.landing-sources')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Explore Sources <ChevronDown size={16} />
          </button>
        </div>
      </section>

      {/* Sources */}
      <section className="landing-sources">
        <div className="landing-divider">
          <span className="landing-divider-line" />
          <span className="landing-divider-text">CONNECTED SOURCES</span>
          <span className="landing-divider-line" />
        </div>

        <div className="landing-source-row">
          {sources.map((s, i) => (
            <div key={i} className="landing-source-chip">
              <div className="landing-source-icon" style={{ color: s.color, background: s.bg }}>
                {s.icon}
              </div>
              <span className="landing-source-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="landing-security">
        <div className="landing-security-card">
          <Shield size={28} />
          <div>
            <h3>Enterprise Security</h3>
            <p>Strict <strong>@walchandsangli.ac.in</strong> domain lock. JWT + Bcrypt protection.</p>
          </div>
          <button className="landing-cta-main landing-cta-sm" onClick={() => onNavigate('login')}>
            Sign In
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-left">
          <span style={{ fontWeight: 700 }}>Trace.AI</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span>SunHacks 2026</span>
        </div>
        <span>Walchand College of Engineering, Sangli</span>
      </footer>
    </div>
  );
}
