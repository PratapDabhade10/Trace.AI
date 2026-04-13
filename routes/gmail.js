const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { google } = require('googleapis');
const Document = require('../models/Document');
const { extractReasoning, getEmbedding } = require('../services/aiService');
const { addToChroma } = require('../services/chromaService');
const { storeDocumentNode } = require('../services/neo4jService');

const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '../gmail_tokens.json');

// Load tokens from disk if we already ran OAuth once
let gmailTokens = null;
if (fs.existsSync(TOKEN_PATH)) {
  try {
    gmailTokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    console.log('✅ Loaded Gmail OAuth tokens from disk');
  } catch (err) {
    console.warn('⚠️ Failed to load Gmail tokens from disk');
  }
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

// GET /auth/google — start OAuth
router.get('/auth/google', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly'
    ]
  });
  res.redirect(url);
});

// GET /auth/google/callback
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    gmailTokens = tokens;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens)); // Save for future restarts
    res.json({ success: true, message: 'Gmail connected! Tokens saved to disk. Polling is active.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ... (OAuth helpers keep from before, replacing fetch routing)
async function fetchAndIngestEmails(max_results = 10) {
  if (!gmailTokens) return { error: 'Gmail not connected' };

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(gmailTokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const listResp = await gmail.users.messages.list({ userId: 'me', maxResults: max_results });
    const messages = listResp.data.messages || [];

    const ingested = [];
    for (const msgRef of messages) {
      // Deduplication Check
      const existingDoc = await Document.findOne({ 'metadata.messageId': msgRef.id });
      if (existingDoc) continue; // Skip if we already ingested this email

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
        metadata: { sender, date, messageId: msgRef.id }
      });
      await doc.save();
      const docId = doc._id.toString();

      const embedding = await getEmbedding(body);
      if (embedding.length > 0) await addToChroma(docId, embedding, body, { source: 'gmail', title: subject, docId });
      await storeDocumentNode(docId, subject, 'gmail', extracted.decision, extracted.tags);

      ingested.push({ docId, subject, summary: extracted.summary });
    }

    return { success: true, ingested_count: ingested.length, emails: ingested };
  } catch (err) {
    console.error('Gmail fetch error:', err.message);
    return { error: err.message };
  }
}

// Background Cron Job runs every 1 minute
cron.schedule('*/1 * * * *', async () => {
  if (gmailTokens) {
    console.log('🔄 Cron: Auto-fetching latest Gmail messages...');
    const result = await fetchAndIngestEmails(5); // fetch top 5 every minute to check
    if (result.success && result.ingested_count > 0) {
      console.log(`✅ Cron: Ingested ${result.ingested_count} new emails.`);
    }
  }
});

// POST /api/gmail/fetch
router.post('/api/gmail/fetch', async (req, res) => {
  const { max_results = 10 } = req.body;
  const result = await fetchAndIngestEmails(max_results);
  
  if (result.error) {
    const status = result.error === 'Gmail not connected' ? 401 : 500;
    return res.status(status).json(result);
  }
  
  res.json(result);
});

module.exports = router;