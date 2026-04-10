const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const Document = require('../models/Document');
const { extractReasoning, getEmbedding } = require('../services/aiService');
const { addToChroma } = require('../services/chromaService');
const { storeDocumentNode } = require('../services/neo4jService');

// Store tokens in memory (fine for hackathon)
let gmailTokens = null;

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

// GET /auth/google — start OAuth
router.get('/google', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  });
  res.redirect(url);
});

// GET /auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    gmailTokens = tokens;
    res.json({ success: true, message: 'Gmail connected! Now POST /api/gmail/fetch to ingest emails.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/gmail/fetch
router.post('/gmail/fetch', async (req, res) => {
  if (!gmailTokens) {
    return res.status(401).json({ error: 'Gmail not connected. Visit http://localhost:5000/auth/google first.' });
  }

  try {
    const { max_results = 10 } = req.body;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(gmailTokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const listResp = await gmail.users.messages.list({ userId: 'me', maxResults: max_results });
    const messages = listResp.data.messages || [];

    const ingested = [];
    for (const msgRef of messages) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: msgRef.id, format: 'full' });
      const headers = {};
      (msg.data.payload.headers || []).forEach(h => { headers[h.name] = h.value; });

      const subject = headers['Subject'] || 'No Subject';
      const sender = headers['From'] || 'Unknown';
      const date = headers['Date'] || '';

      // Extract body
      let body = '';
      const payload = msg.data.payload;
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      } else if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      if (!body.trim()) continue;
      body = body.slice(0, 2000);

      const extracted = await extractReasoning(body, 'gmail');
      const doc = new Document({
        source: 'gmail',
        title: subject,
        rawContent: body,
        summary: extracted.summary,
        decision: extracted.decision,
        reasoning: extracted.reasoning,
        tags: extracted.tags,
        metadata: { sender, date }
      });
      await doc.save();
      const docId = doc._id.toString();

      const embedding = await getEmbedding(body);
      if (embedding.length > 0) await addToChroma(docId, embedding, body, { source: 'gmail', title: subject, docId });
      await storeDocumentNode(docId, subject, 'gmail', extracted.decision, extracted.tags);

      ingested.push({ docId, subject, summary: extracted.summary });
    }

    res.json({ success: true, ingested_count: ingested.length, emails: ingested });
  } catch (err) {
    console.error('Gmail fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;