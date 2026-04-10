const express = require('express');
const router = express.Router();
const Document = require('../models/Document');

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const { source, limit = 20 } = req.query;
    const query = source ? { source } : {};
    const docs = await Document.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ documents: docs, total: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;