const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { extractReasoning, getEmbedding } = require('../services/aiService');
const { addToChroma } = require('../services/chromaService');
const { storeDocumentNode } = require('../services/neo4jService');

// POST /api/ingest
router.post('/', async (req, res) => {
  try {
    const { source, title, content, metadata = {} } = req.body;

    if (!source || !title || !content) {
      return res.status(400).json({ error: 'source, title, content are required' });
    }

    // 1. Extract reasoning with Gemini
    const extracted = await extractReasoning(content, source);

    // 2. Save to MongoDB
    const doc = new Document({
      source,
      title,
      rawContent: content,
      summary: extracted.summary,
      decision: extracted.decision,
      reasoning: extracted.reasoning,
      tags: extracted.tags,
      metadata
    });
    await doc.save();
    const docId = doc._id.toString();

    // 3. Get embedding and save to ChromaDB
    const embedding = await getEmbedding(content);
    if (embedding.length > 0) {
      await addToChroma(docId, embedding, content, { source, title, docId });
    }

    // 4. Save to Neo4j
    await storeDocumentNode(docId, title, source, extracted.decision, extracted.tags);

    res.json({
      success: true,
      docId,
      summary: extracted.summary,
      decision: extracted.decision,
      reasoning: extracted.reasoning,
      tags: extracted.tags
    });

  } catch (err) {
    console.error('Ingest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;