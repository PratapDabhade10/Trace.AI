const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true
  },
  title: { type: String, required: true },
  rawContent: { type: String, required: true },
  summary: { type: String, default: '' },
  decision: { type: String, default: '' },
  reasoning: { type: String, default: '' },
  tags: [String],
  metadata: {
    sender: String,
    channel: String,
    date: String,
    participants: [String],
    messageId: String,
    googleDocId: String,
    createdTime: String,
    modifiedTime: String,
    fullLength: Number
  },
  createdAt: { type: Date, default: Date.now }
});

// Text index for MongoDB $text search fallback in ask.js
DocumentSchema.index({ title: 'text', rawContent: 'text', summary: 'text' });

module.exports = mongoose.model('Document', DocumentSchema);