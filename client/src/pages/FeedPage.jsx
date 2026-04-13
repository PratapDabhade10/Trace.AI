import { useState, useEffect } from 'react';
import { RefreshCw, Clock, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';

const SOURCE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Gmail', value: 'gmail' },
  { label: 'Slack', value: 'slack' },
  { label: 'Docs', value: 'google_docs' },
  { label: 'Transcript', value: 'transcript' },
  { label: 'Manual', value: 'manual' },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FeedPage() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments(filter, 50);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [filter]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-subtitle">Structured knowledge extracted from your integrations</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', padding: 4, borderRadius: 8 }}>
            {SOURCE_FILTERS.map((f) => (
              <button
                key={f.value}
                style={{
                  background: filter === f.value ? 'var(--bg-primary)' : 'transparent',
                  color: filter === f.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: filter === f.value ? '1px solid var(--border)' : '1px solid transparent',
                  boxShadow: filter === f.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={fetchDocs}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>
      
      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 100, width: '100%', borderRadius: 12 }} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No documents found</h3>
            <p>Try changing your filter or ingest more data.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {documents.map((doc) => {
              const isExpanded = selected === doc._id;
              
              return (
                <div
                  key={doc._id}
                  className="card"
                  style={{
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.02)',
                    borderColor: isExpanded ? 'var(--text-primary)' : 'var(--border)'
                  }}
                  onClick={() => setSelected(isExpanded ? null : doc._id)}
                >
                  <div style={{ padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ paddingTop: 2 }}>
                      <span className={`source-badge ${doc.source}`} style={{ width: 80, justifyContent: 'center' }}>{doc.source}</span>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, paddingRight: 16, lineHeight: 1.3 }}>
                          {doc.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, color: 'var(--text-tertiary)' }}>
                          <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
                            <Clock size={12} /> {timeAgo(doc.createdAt)}
                          </span>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {doc.summary || doc.rawContent?.substring(0, 200)}
                      </div>

                      {/* Tags */}
                      {doc.tags && doc.tags.length > 0 && !isExpanded && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
                          <Tag size={12} color="var(--text-tertiary)" />
                          {doc.tags.slice(0, 4).map((t, i) => (
                            <span key={i} style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED CONTENT AREA */}
                  {isExpanded && (
                    <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 24, animation: 'fadeUp 0.3s ease' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                            AI Reasoning
                          </div>
                          <div style={{ background: 'var(--bg-app)', padding: 16, borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, border: '1px solid var(--border)' }}>
                            {doc.reasoning || 'No extracted reasoning available.'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                            Context / Actions
                          </div>
                          {doc.decision && doc.decision !== 'No decision' && (
                            <div style={{ background: 'var(--success-bg)', color: 'var(--text-primary)', padding: 12, borderRadius: 6, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--success)', display: 'block', marginBottom: 4 }}>
                                Decision
                              </span>
                              {doc.decision}
                            </div>
                          )}
                          
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                            Raw Source
                          </div>
                          <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {doc.rawContent}
                          </div>
                        </div>
                      </div>

                      {/* Full Tags List */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                            Index Tags
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {doc.tags.map((t, i) => (
                              <span key={i} style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 4, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                #{t.replace(/\s+/g, '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
