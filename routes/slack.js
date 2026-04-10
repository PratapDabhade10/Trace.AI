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

// POST /api/slack/fetch
router.post('/fetch', async (req, res) => {
  try {
    const { channel_name = 'general', limit = 10 } = req.body;

    // Find channel
    const response = await slack.conversations.list({ types: 'public_channel' });
    const channel = response.channels.find(c => c.name === channel_name);
    if (!channel) return res.status(404).json({ error: `Channel #${channel_name} not found` });

    // Fetch history
    const history = await slack.conversations.history({ channel: channel.id, limit });
    const messages = history.messages.filter(m => m.text && !m.subtype);

    const ingested = [];
    for (const msg of messages) {
      let sender = msg.user || 'Unknown';
      try {
        const userResp = await slack.users.info({ user: msg.user });
        sender = userResp.user.profile.real_name || sender;
      } catch (_) {}

      const extracted = await extractReasoning(msg.text, 'slack');
      const doc = new Document({
        source: 'slack',
        title: `Slack #${channel_name} - ${sender}`,
        rawContent: msg.text,
        summary: extracted.summary,
        decision: extracted.decision,
        reasoning: extracted.reasoning,
        tags: extracted.tags,
        metadata: { sender, channel: channel_name, date: new Date(msg.ts * 1000).toISOString() }
      });
      await doc.save();
      const docId = doc._id.toString();

      const embedding = await getEmbedding(msg.text);
      if (embedding.length > 0) await addToChroma(docId, embedding, msg.text, { source: 'slack', title: doc.title, docId });
      await storeDocumentNode(docId, doc.title, 'slack', extracted.decision, extracted.tags);

      ingested.push({ docId, summary: extracted.summary, decision: extracted.decision });
    }

    res.json({ success: true, ingested_count: ingested.length, messages: ingested });
  } catch (err) {
    console.error('Slack fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;