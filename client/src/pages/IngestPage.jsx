import { useState, useRef, useEffect } from 'react';
import { Mail, Hash, FileText, Mic, Upload, X, ArrowRight, ChevronDown, Check, FolderOpen, RefreshCw } from 'lucide-react';
import { api } from '../api';

function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="custom-select-container" ref={ref}>
      <div 
        className={`custom-select-trigger ${open ? 'open' : ''}`} 
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: selectedOption.color || 'inherit' }}>{selectedOption.icon}</span>
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {open && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              className="custom-select-item"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span style={{ color: opt.color || 'inherit', width: 20, display: 'flex', justifyContent: 'center' }}>
                {opt.icon}
              </span>
              <span style={{ flex: 1, fontWeight: value === opt.value ? '700' : '500' }}>{opt.label}</span>
              {value === opt.value && <Check size={14} color="var(--accent-dark)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IngestPage() {
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Manual ingest form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('manual');

  // Google Docs state
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleManualIngest = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const data = await api.ingest(source, title, content);
      showToast(`Ingested "${title}" — ${data.tags?.length || 0} tags extracted`);
      setTitle('');
      setContent('');
      setModal(null);
    } catch (err) {
      showToast('Ingestion failed. Check the backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGmailFetch = async () => {
    setLoading(true);
    try {
      const data = await api.fetchGmail(10);
      showToast(`Gmail: ${data.ingested_count || 0} new emails ingested`);
      setModal(null);
    } catch (err) {
      showToast('Gmail fetch failed. Ensure OAuth is connected.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSlackFetch = async (channelName) => {
    setLoading(true);
    try {
      const data = await api.fetchSlack(channelName, 10);
      showToast(`Slack #${channelName}: ${data.ingested_count || 0} new messages ingested`);
    } catch (err) {
      showToast('Slack fetch failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Google Docs handlers
  const handleOpenGDocs = async () => {
    setModal('gdocs');
    setDriveLoading(true);
    setSyncResult(null);
    try {
      const data = await api.listDriveDocs();
      setDriveFiles(data.files || []);
    } catch (err) {
      setDriveFiles([]);
      showToast('Could not list Drive files. Ensure OAuth is connected with Drive scope.', 'error');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleSyncGDocs = async () => {
    setDriveLoading(true);
    setSyncResult(null);
    try {
      const data = await api.fetchDriveDocs();
      setSyncResult(data);
      showToast(`Google Docs: ${data.ingested_count || 0} new docs ingested`);
      // Re-fetch the list to update statuses
      const updated = await api.listDriveDocs();
      setDriveFiles(updated.files || []);
    } catch (err) {
      showToast('Drive sync failed. Check backend logs.', 'error');
    } finally {
      setDriveLoading(false);
    }
  };

  const sources = [
    {
      key: 'gmail',
      icon: <Mail size={22} />,
      title: 'Gmail Context',
      desc: 'Auto-polling every 60s. Tap to force a manual fetch.',
      status: 'active',
      statusLabel: 'Auto-sync active',
      onClick: () => setModal('gmail'),
    },
    {
      key: 'slack',
      icon: <Hash size={22} />,
      title: 'Slack Engine',
      desc: 'Ingests threads and DMs instantly from public channels.',
      status: 'active',
      statusLabel: 'Auto-sync active',
      onClick: () => setModal('slack'),
    },
    {
      key: 'docs',
      icon: <FolderOpen size={22} />,
      title: 'Google Drive Docs',
      desc: 'Sync Google Docs from your company shared Drive folder.',
      status: 'active',
      statusLabel: 'Drive Connected',
      onClick: handleOpenGDocs,
    },
    {
      key: 'transcript',
      icon: <Mic size={22} />,
      title: 'Meeting Transcript',
      desc: 'Drop a Zoom/Meet transcript to auto-extract action items.',
      status: 'inactive',
      statusLabel: 'Manual Input',
      onClick: () => { setSource('transcript'); setModal('manual'); },
    },
  ];

  const sourceOptions = [
    { value: 'manual', label: 'Plain Text Note', icon: <FileText size={16} />, color: 'var(--text-secondary)' },
    { value: 'transcript', label: 'Meeting Transcript', icon: <Mic size={16} />, color: 'var(--transcript)' },
    { value: 'google_docs', label: 'Google Document', icon: <FileText size={16} />, color: 'var(--docs)' },
  ];

  return (
    <>
      <div className="page-header" style={{ padding: '24px 32px' }}>
        <div>
          <div className="page-title">Ingest Data</div>
          <div className="page-subtitle">Inject knowledge chunks into your organizational graph</div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { setSource('manual'); setModal('manual'); }} 
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          <Upload size={16} />
          Manual Upload
        </button>
      </div>

      <div className="page-body">
        <div className="ingest-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {sources.map((s, index) => (
            <div 
              key={s.key} 
              className="ingest-card" 
              onClick={s.onClick} 
              style={{
                animation: `staggeredFade 0.4s ease forwards`,
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
                border: '1px solid var(--border)',
                transition: 'all 0.2s var(--ease)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div className={`ingest-card-icon ${s.key}`} style={{ background: 'var(--bg-tertiary)' }}>{s.icon}</div>
                <div className={`ingest-status ${s.status}`} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
                  {s.status === 'active' && <div className="status-dot" style={{ width: 6, height: 6 }} />}
                  {s.statusLabel}
                </div>
              </div>
              <div className="ingest-card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div className="ingest-card-desc" style={{ fontSize: 13, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── GMAIL MODAL ─── */}
      {modal === 'gmail' && (
        <div className="modal-overlay" onClick={() => !loading && setModal(null)} style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ animation: 'dropDownScale 0.3s var(--ease)' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail color="var(--gmail)" size={20} /> Gmail Force-Sync</div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                The ingestion engine already auto-polls Gmail every 60 seconds. Push this to trigger an immediate, manual sync of the 10 latest threads.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGmailFetch} disabled={loading}>
                {loading ? <div className="spinner border-spinner" /> : <><Mail size={15} /> Force Sync</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SLACK MODAL ─── */}
      {modal === 'slack' && (
        <SlackModal loading={loading} onClose={() => setModal(null)} onFetch={handleSlackFetch} />
      )}

      {/* ─── GOOGLE DOCS MODAL ─── */}
      {modal === 'gdocs' && (
        <div className="modal-overlay" onClick={() => !driveLoading && setModal(null)} style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 650, animation: 'dropDownScale 0.3s var(--ease)' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen color="var(--docs)" size={20} /> Google Drive — Company Docs
              </div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {driveLoading && driveFiles.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }} />
                  <div>Scanning Drive folder...</div>
                </div>
              ) : driveFiles.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                  <div>No Google Docs found in the folder.</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>Make sure OAuth has Drive scope. Visit <a href="http://localhost:5000/auth/google" target="_blank" rel="noreferrer" style={{ color: 'var(--docs)' }}>/auth/google</a> to re-authenticate.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                    Found <strong>{driveFiles.length}</strong> Google Docs in your company folder
                  </div>
                  {driveFiles.map((f, i) => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: f.alreadyIngested ? 'var(--success-bg)' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                    }}>
                      <FileText size={16} color={f.alreadyIngested ? 'var(--success)' : 'var(--docs)'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          by {f.owner} • {new Date(f.modifiedTime).toLocaleDateString()}
                        </div>
                      </div>
                      {f.alreadyIngested && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Synced</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {syncResult && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--success-bg)', borderRadius: 8, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                  ✅ Ingested {syncResult.ingested_count} new docs{syncResult.skipped_count > 0 ? ` • Skipped ${syncResult.skipped_count} (already synced)` : ''}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={handleSyncGDocs} disabled={driveLoading || driveFiles.length === 0}>
                {driveLoading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <><RefreshCw size={15} /> Sync All Docs</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MANUAL INGEST MODAL ─── */}
      {modal === 'manual' && (
        <div className="modal-overlay" onClick={() => !loading && setModal(null)} style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 600, animation: 'dropDownScale 0.3s var(--ease)' }}>
            <div className="modal-header" style={{ padding: '24px 32px 16px', borderBottom: 'none' }}>
              <div className="modal-title" style={{ fontSize: 20, fontWeight: 700 }}>
                Knowledge Upload
              </div>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            
            <div className="modal-body" style={{ padding: '0 32px' }}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Ingestion Source</label>
                <CustomSelect 
                  value={source} 
                  onChange={setSource}
                  options={sourceOptions}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Document Title</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Pipeline Strategy Meeting"
                  style={{ fontSize: 15, padding: '14px 16px', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Raw Context</label>
                <textarea
                  className="input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the raw text block, transcript log, or documentation here..."
                  style={{ minHeight: 200, fontSize: 14, lineHeight: 1.6, padding: '16px', borderRadius: 'var(--radius-md)', resize: 'vertical' }}
                />
              </div>
            </div>
            
            <div className="modal-footer" style={{ padding: '24px 32px', borderTop: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>This will be processed by the LLM before storing.</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)} style={{ borderRadius: 'var(--radius-md)' }}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleManualIngest}
                  disabled={loading || !title.trim() || !content.trim()}
                  style={{ borderRadius: 'var(--radius-md)', padding: '10px 24px' }}
                >
                  {loading ? <div className="spinner border-spinner" /> : <span style={{ fontWeight: 600 }}>Analyze & Ingest</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`} style={{ animation: 'staggeredFade 0.3s ease forwards' }}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}

function SlackModal({ loading, onClose, onFetch }) {
  const [channel, setChannel] = useState('general');

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()} style={{ backdropFilter: 'blur(4px)' }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ animation: 'dropDownScale 0.3s var(--ease)' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Hash color="var(--slack)" size={20} /> Target Slack Channel</div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
            Specify a target channel to forcefully sync the most recent messages.
          </p>
          <div className="form-group">
            <input
              className="input"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="e.g. engineering"
              style={{ fontSize: 16, padding: '14px 16px' }}
            />
          </div>
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onFetch(channel)}
            disabled={loading || !channel.trim()}
          >
            {loading ? <div className="spinner border-spinner" /> : <>Pull #{channel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
