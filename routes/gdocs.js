const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const Document = require('../models/Document');
const { extractReasoning, getEmbedding } = require('../services/aiService');
const { addToChroma } = require('../services/chromaService');
const { storeDocumentNode } = require('../services/neo4jService');

const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '../gmail_tokens.json');

function getTokens() {
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    } catch (err) {
      return null;
    }
  }
  return null;
}

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  const tokens = getTokens();
  if (tokens) client.setCredentials(tokens);
  return client;
}

// GET /api/gdocs/list — Preview files in the Drive folder
router.get('/list', async (req, res) => {
  const tokens = getTokens();
  if (!tokens) {
    return res.status(401).json({ error: 'Google not connected. Go to /auth/google to authenticate.' });
  }

  try {
    const auth = getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      return res.status(400).json({ error: 'GOOGLE_DRIVE_FOLDER_ID not set in .env' });
    }

    // List all Google Docs in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, name, createdTime, modifiedTime, owners)',
      pageSize: 100,
      orderBy: 'modifiedTime desc',
    });

    const files = (response.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      owner: f.owners?.[0]?.displayName || 'Unknown',
    }));

    // Check which ones are already ingested
    const existingDocs = await Document.find({
      'metadata.googleDocId': { $in: files.map(f => f.id) }
    }).select('metadata.googleDocId');
    const ingestedIds = new Set(existingDocs.map(d => d.metadata?.googleDocId));

    const filesWithStatus = files.map(f => ({
      ...f,
      alreadyIngested: ingestedIds.has(f.id),
    }));

    res.json({ success: true, folder_id: folderId, count: files.length, files: filesWithStatus });
  } catch (err) {
    console.error('Drive list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const cron = require('node-cron');

async function fetchAndIngestGDocs() {
  const tokens = getTokens();
  if (!tokens) return { error: 'Google not connected.' };

  try {
    const auth = getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });
    const docs = google.docs({ version: 'v1', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) return { error: 'GOOGLE_DRIVE_FOLDER_ID not set' };

    const listResp = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, name, createdTime, modifiedTime)',
      pageSize: 100,
      orderBy: 'modifiedTime desc',
    });

    const files = listResp.data.files || [];
    const ingested = [];
    const skipped = [];

    for (const file of files) {
      const existing = await Document.findOne({ 'metadata.googleDocId': file.id, 'metadata.modifiedTime': file.modifiedTime });
      if (existing) {
        skipped.push({ id: file.id, name: file.name, reason: 'already_ingested_latest_version' });
        continue;
      }

      let textContent = '';
      try {
        const docResp = await docs.documents.get({ documentId: file.id });
        textContent = extractTextFromDoc(docResp.data);
      } catch (docErr) {
        console.error(`Failed to read doc "${file.name}":`, docErr.message);
        skipped.push({ id: file.id, name: file.name, reason: docErr.message });
        continue;
      }

      if (!textContent.trim()) {
        skipped.push({ id: file.id, name: file.name, reason: 'empty_content' });
        continue;
      }

      const truncated = textContent.slice(0, 4000);
      const extracted = await extractReasoning(truncated, 'google_docs');

      const doc = new Document({
        source: 'google_docs',
        title: file.name,
        rawContent: truncated,
        summary: extracted.summary,
        decision: extracted.decision,
        reasoning: extracted.reasoning,
        tags: extracted.tags,
        metadata: {
          googleDocId: file.id,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          fullLength: textContent.length,
        }
      });
      await doc.save();
      const docId = doc._id.toString();

      const embedding = await getEmbedding(truncated);
      if (embedding.length > 0) {
        await addToChroma(docId, embedding, truncated, {
          source: 'google_docs',
          title: file.name,
          docId,
        });
      }

      await storeDocumentNode(docId, file.name, 'google_docs', extracted.decision, extracted.tags);

      ingested.push({
        docId,
        name: file.name,
        summary: extracted.summary,
        tags: extracted.tags,
      });
    }

    return {
      success: true,
      ingested_count: ingested.length,
      skipped_count: skipped.length,
      ingested,
      skipped,
    };
  } catch (err) {
    console.error('GDocs fetch error:', err.message);
    return { error: err.message };
  }
}

// Background Cron Job runs every 1 minute
cron.schedule('*/1 * * * *', async () => {
  const tokens = getTokens();
  if (tokens) {
    console.log('🔄 Cron: Auto-fetching Google Docs...');
    const result = await fetchAndIngestGDocs();
    if (result.success && result.ingested_count > 0) {
      console.log(`✅ Cron: Ingested ${result.ingested_count} new/updated Google Docs.`);
    }
  }
});

// POST /api/gdocs/fetch — Fetch & ingest all Google Docs from the folder
router.post('/fetch', async (req, res) => {
  const result = await fetchAndIngestGDocs();
  if (result.error) {
    return res.status(500).json(result);
  }
  res.json(result);
});

/**
 * Extracts plain text from a Google Docs API response body.
 * Walks through the structural elements and pulls out textRun content.
 */
function extractTextFromDoc(docData) {
  const content = docData.body?.content || [];
  let text = '';

  for (const element of content) {
    if (element.paragraph) {
      for (const pe of element.paragraph.elements || []) {
        if (pe.textRun) {
          text += pe.textRun.content;
        }
      }
    } else if (element.table) {
      // Extract text from table cells
      for (const row of element.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          for (const cellContent of cell.content || []) {
            if (cellContent.paragraph) {
              for (const pe of cellContent.paragraph.elements || []) {
                if (pe.textRun) {
                  text += pe.textRun.content;
                }
              }
            }
          }
          text += '\t';
        }
        text += '\n';
      }
    }
  }

  return text.trim();
}

module.exports = router;
