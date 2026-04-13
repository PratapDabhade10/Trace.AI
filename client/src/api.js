const API_BASE = 'http://localhost:5000';

export const api = {
  // Ask the AI a question
  ask: async (question) => {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Failed to get answer');
    return res.json();
  },

  // Fetch all ingested documents
  getDocuments: async (source = '', limit = 50) => {
    const params = new URLSearchParams();
    if (source) params.set('source', source);
    params.set('limit', limit);
    const res = await fetch(`${API_BASE}/api/documents?${params}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  // Fetch a single document by ID
  getDocument: async (id) => {
    const res = await fetch(`${API_BASE}/api/documents/${id}`);
    if (!res.ok) throw new Error('Document not found');
    return res.json();
  },

  // Manually ingest content
  ingest: async (source, title, content, metadata = {}) => {
    const res = await fetch(`${API_BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, title, content, metadata }),
    });
    if (!res.ok) throw new Error('Failed to ingest');
    return res.json();
  },

  // Fetch Slack channels
  getSlackChannels: async () => {
    const res = await fetch(`${API_BASE}/api/slack/channels`);
    if (!res.ok) throw new Error('Failed to fetch channels');
    return res.json();
  },

  // Manually trigger Slack fetch
  fetchSlack: async (channel_name, limit = 10) => {
    const res = await fetch(`${API_BASE}/api/slack/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_name, limit }),
    });
    if (!res.ok) throw new Error('Slack fetch failed');
    return res.json();
  },

  // Manually trigger Gmail fetch
  fetchGmail: async (count = 5) => {
    const res = await fetch(`${API_BASE}/api/gmail/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) throw new Error('Gmail fetch failed');
    return res.json();
  },

  // Get Gmail auth URL
  getGmailAuthUrl: () => `${API_BASE}/auth/google`,

  // List Google Docs from Drive folder
  listDriveDocs: async () => {
    const res = await fetch(`${API_BASE}/api/gdocs/list`);
    if (!res.ok) throw new Error('Failed to list Drive docs');
    return res.json();
  },

  // Fetch & ingest all Google Docs from Drive folder
  fetchDriveDocs: async () => {
    const res = await fetch(`${API_BASE}/api/gdocs/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch Drive docs');
    return res.json();
  },
};
