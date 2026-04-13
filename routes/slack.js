const express = require('express');
const router = express.Router();
const { WebClient } = require('@slack/web-api');
const Document = require('../models/Document');
const { extractReasoning, getEmbedding } = require('../services/aiService');
const { addToChroma } = require('../services/chromaService');
const { storeDocumentNode } = require('../services/neo4jService');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// GET /api/slack/channels
router.get('/channels', async (req, res) => {
  try {
    const response = await slack.conversations.list({ types: 'public_channel' });
    const channels = response.channels.map(c => ({ id: c.id, name: c.name }));
    res.json({ channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const cron = require('node-cron');

async function fetchAndIngestSlackMessages(channel_name, limit = 5) {
  try {
    const response = await slack.conversations.list({ types: 'public_channel' });
    const channel = response.channels.find(c => c.name === channel_name);
    if (!channel) return { error: `Channel #${channel_name} not found` };

    // Ensure the bot is in the channel before fetching history
    try {
      await slack.conversations.join({ channel: channel.id });
    } catch (joinErr) {
      if (joinErr.data && joinErr.data.error !== 'already_in_channel') {
         console.error(`Slack join error for #${channel.name}:`, joinErr.data.error);
      }
    }

    const history = await slack.conversations.history({ channel: channel.id, limit });
    const messages = history.messages.filter(m => m.text && !m.subtype);

    const ingested = [];
    for (const msg of messages) {
      // Deduplication check
      const existingDoc = await Document.findOne({ 'metadata.messageId': msg.ts, source: 'slack' });
      if (existingDoc) continue;

      let sender = 'Unknown';
      if (msg.user) {
        try {
          const userResp = await slack.users.info({ user: msg.user });
          sender = userResp.user.profile.real_name || msg.user;
        } catch (_) {
          sender = msg.user;
        }
      }

      const extracted = await extractReasoning(msg.text, 'slack');
      const doc = new Document({
        source: 'slack',
        title: `Slack #${channel_name} - ${sender}`,
        rawContent: msg.text,
        summary: extracted.summary,
        decision: extracted.decision,
        reasoning: extracted.reasoning,
        tags: extracted.tags,
        metadata: { sender, channel: channel_name, date: new Date(msg.ts * 1000).toISOString(), messageId: msg.ts }
      });
      await doc.save();
      const docId = doc._id.toString();

      const embedding = await getEmbedding(msg.text);
      if (embedding.length > 0) await addToChroma(docId, embedding, msg.text, { source: 'slack', title: doc.title, docId });
      await storeDocumentNode(docId, doc.title, 'slack', extracted.decision, extracted.tags);

      ingested.push({ docId, summary: extracted.summary, decision: extracted.decision });
    }

    return { success: true, ingested_count: ingested.length, messages: ingested };
  } catch (err) {
    console.error('Slack fetch error:', err.message);
    return { error: err.message };
  }
}

// Background Cron Job runs every 1 minute
cron.schedule('*/1 * * * *', async () => {
  if (!process.env.SLACK_BOT_TOKEN) return;
  console.log('🔄 Cron: Auto-fetching latest Slack messages from all channels...');
  try {
    const response = await slack.conversations.list({ types: 'public_channel' });
    for (const channel of response.channels) {
      const result = await fetchAndIngestSlackMessages(channel.name, 5);
      if (result.success && result.ingested_count > 0) {
        console.log(`✅ Cron: Ingested ${result.ingested_count} new messages from #${channel.name}`);
      }
    }
  } catch (err) {
    console.error('Cron Slack error:', err.message);
  }
});

// POST /api/slack/fetch
router.post('/fetch', async (req, res) => {
  const { channel_name = 'general', limit = 10 } = req.body;
  const result = await fetchAndIngestSlackMessages(channel_name, limit);
  
  if (result.error) {
    return res.status(result.error.includes('not found') ? 404 : 500).json(result);
  }
  res.json(result);
});

module.exports = router;