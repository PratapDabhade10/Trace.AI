const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['gmail', 'slack', 'meeting', 'document'],
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
    participants: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', DocumentSchema);