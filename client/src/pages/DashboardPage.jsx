import { useState, useEffect } from 'react';
import { Plus, Mail, Hash, FileText, Upload, MessageSquare, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function DashboardPage({ setPage }) {
  const [stats, setStats] = useState({ total: 0, gmail: 0, slack: 0, docs: 0, transcript: 0, manual: 0 });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allData = await api.getDocuments('', 20);
        const docs = allData.documents || [];
        setStats({
          total: docs.length,
          gmail: docs.filter(d => d.source === 'gmail').length,
          slack: docs.filter(d => d.source === 'slack').length,
          docs: docs.filter(d => d.source === 'google_docs').length,
          transcript: docs.filter(d => d.source === 'transcript').length,
          manual: docs.filter(d => d.source === 'manual').length,
        });
        setRecentDocs(docs.slice(0, 8)); // Grab up to 8 recent docs for activity
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getSourceDetails = (source) => {
    switch(source) {
      case 'gmail': return { icon: <Mail size={14}/>, color: 'var(--gmail)', label: 'Gmail' };
      case 'slack': return { icon: <Hash size={14}/>, color: 'var(--slack)', label: 'Slack' };
      case 'google_docs': return { icon: <FileText size={14}/>, color: 'var(--docs)', label: 'Docs' };
      default: return { icon: <FileText size={14}/>, color: 'var(--text-secondary)', label: 'Upload' };
    }
  };

  const calculateBreakdown = () => {
    if (stats.total === 0) return [];
    return [
      { label: 'Gmail', val: stats.gmail, color: 'var(--gmail)', width: `${(stats.gmail/stats.total)*100}%` },
      { label: 'Slack', val: stats.slack, color: 'var(--slack)', width: `${(stats.slack/stats.total)*100}%` },
      { label: 'Documents', val: stats.docs + stats.transcript + stats.manual, color: 'var(--docs)', width: `${((stats.docs + stats.transcript + stats.manual)/stats.total)*100}%` },
    ].filter(item => item.val > 0);
  };

  const breakdownData = calculateBreakdown();

  return (
    <>
      <div className="page-header" style={{ padding: '24px 32px' }}>
        <div className="page-title">Overview</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="status-indicator">
            <div className="status-dot" />
            <span>API Connected</span>
          </div>
          <button className="btn btn-primary" style={{ borderRadius: 6, fontWeight: 600 }} onClick={() => setPage('ingest')}>
            <Plus size={16} /> Ingest
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ─── STATS ─── */}
        <div className="stats-grid">
          <div className="stat-card" style={{ borderTop: '3px solid var(--accent-dark)' }}>
            <div className="stat-label">Total Documents</div>
            <div className="stat-value">{loading ? '—' : stats.total}</div>
            <div className="stat-meta">
              <span className="live-badge" style={{ marginTop: 8 }}>↑ Live</span>
            </div>
          </div>
          
          <div className="stat-card" style={{ borderTop: '3px solid var(--gmail)' }}>
            <div className="stat-label">Gmail Ingested</div>
            <div className="stat-value">{loading ? '—' : stats.gmail}</div>
            <div className="stat-meta" style={{ marginTop: 12 }}>Emails processed</div>
          </div>

          <div className="stat-card" style={{ borderTop: '3px solid var(--slack)' }}>
            <div className="stat-label">Slack Messages</div>
            <div className="stat-value">{loading ? '—' : stats.slack}</div>
            <div className="stat-meta" style={{ marginTop: 12 }}>Channels monitored</div>
          </div>

          <div className="stat-card" style={{ borderTop: '3px solid var(--docs)' }}>
            <div className="stat-label">Manual Docs</div>
            <div className="stat-value">{loading ? '—' : stats.docs + stats.transcript + stats.manual}</div>
            <div className="stat-meta" style={{ marginTop: 12 }}>Documents & meetings</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* ─── RECENT ACTIVITY ─── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Activity</span>
              <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12, border: '1px solid var(--border)' }} onClick={() => setPage('feed')}>
                View all
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading activity...</div>
              ) : recentDocs.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">📝</div>
                  <h3 style={{ marginTop: 12 }}>No recent activity</h3>
                  <p>Inbound documents and messages will appear here.</p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentDocs.map(doc => {
                    const src = getSourceDetails(doc.source);
                    return (
                      <div key={doc._id} className="activity-item" onClick={() => setPage('feed')} style={{ cursor: 'pointer' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-tertiary)', color: src.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {src.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="activity-title" style={{ fontSize: 13, fontWeight: 600 }}>{doc.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ color: src.color, fontWeight: 500 }}>{src.label}</span>
                            <span>•</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                          </div>
                        </div>
                        <ArrowRight size={14} color="var(--text-tertiary)" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT CHUNKS ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Source Breakdown */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Source Breakdown</span>
              </div>
              <div className="card-body">
                {breakdownData.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No data yet</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* The Bar */}
                    <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                      {breakdownData.map((b, i) => (
                        <div key={i} style={{ width: b.width, background: b.color, height: '100%' }} />
                      ))}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {breakdownData.map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                          {b.label} <span style={{ color: 'var(--text-tertiary)', marginLeft: 2, fontFamily: 'var(--font-mono)' }}>{b.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Quick Actions</span>
              </div>
              <div className="card-body">
                <div className="action-list">
                  <button className="action-btn" onClick={() => setPage('ask')}>
                    <MessageSquare size={16} color="var(--text-secondary)" />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Ask a question</span>
                  </button>
                  <button className="action-btn" onClick={() => setPage('ingest')}>
                    <Upload size={16} color="var(--text-secondary)" />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Upload document</span>
                  </button>
                  <button className="action-btn" onClick={() => setPage('ingest')}>
                    <Mail size={16} color="var(--text-secondary)" />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Connect Gmail</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
