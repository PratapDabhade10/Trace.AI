const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { getEmbedding, answerQuestion } = require('../services/aiService');
const { queryChroma } = require('../services/chromaService');
const mongoose = require('mongoose');

// POST /api/ask
router.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    let contextDocs = [];

    // 1. Try ChromaDB semantic search first
    const embedding = await getEmbedding(question);
    if (embedding.length > 0) {
      const chromaIds = await queryChroma(embedding, 4);
      if (chromaIds.length > 0) {
        const objectIds = chromaIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        contextDocs = await Document.find({ _id: { $in: objectIds } });
      }
    }

    // 2. Fallback to MongoDB text search if ChromaDB returned nothing
    if (contextDocs.length === 0) {
      contextDocs = await Document.find(
        { $text: { $search: question } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(4);
    }

    // 3. Final fallback - just get recent docs
    if (contextDocs.length === 0) {
      contextDocs = await Document.find().sort({ createdAt: -1 }).limit(4);
    }

    if (contextDocs.length === 0) {
      return res.json({
        answer: 'No documents found. Please ingest some data first.',
        sources: []
      });
    }

    // 4. Answer with Gemini
    const answer = await answerQuestion(question, contextDocs);

    const sources = contextDocs.map(d => ({
      docId: d._id.toString(),
      title: d.title,
      source: d.source,
      summary: d.summary,
      decision: d.decision,
      reasoning: d.reasoning,
      createdAt: d.createdAt
    }));

    res.json({ answer, sources });

  } catch (err) {
    console.error('Ask error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;