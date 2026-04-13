const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Local Inference mechanism for embeddings
let pipeline = null;
async function getPipeline() {
  if (pipeline) return pipeline;
  const transformers = await import('@xenova/transformers');
  // Load local embedding model
  pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ Local Transformers Pipeline loaded');
  return pipeline;
}

// Extract reasoning, decision, summary, tags from raw content
async function extractReasoning(content, source) {
  const prompt = `You are analyzing a ${source} message from a company.
Extract the following as valid JSON only:

{
  "summary": "one line summary",
  "decision": "what decision was made, or No decision if none",
  "reasoning": "why this decision was made or key insight",
  "tags": ["tag1", "tag2", "tag3"]
}

Content:
${content}

Return ONLY valid JSON.`;

  try {
    const result = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(result.choices[0].message.content);
  } catch (err) {
    console.error('extractReasoning error:', err.message);
    return {
      summary: content.slice(0, 100),
      decision: 'No decision',
      reasoning: 'Could not extract reasoning',
      tags: []
    };
  }
}

// Get embedding vector natively via transformers.js
async function getEmbedding(text) {
  try {
    const extractor = await getPipeline();
    // Generate embeddings
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // Convert to standard JS array format required by ChromaDB
    return Array.from(output.data);
  } catch (err) {
    console.error('getEmbedding error:', err.message);
    return [];
  }
}

// Answer a plain English question using context docs
async function answerQuestion(question, contextDocs) {
  const context = contextDocs.map(d =>
    `[Source: ${d.source.toUpperCase()} | ${d.title}]\n${d.rawContent}`
  ).join('\n\n');

  const prompt = `You are OrgMind, an AI assistant that answers questions about company decisions and communications.
Use ONLY the context below to answer. Always clearly mention which source (Gmail/Slack/Meeting) the answer comes from.

Context:
${context}

Question: ${question}

Give a clear, concise answer and cite the exact source.`;

  try {
    const result = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile'
    });
    return result.choices[0].message.content;
  } catch (err) {
    console.error('answerQuestion error:', err.message);
    throw new Error('Failed to generate answer');
  }
}

module.exports = { extractReasoning, getEmbedding, answerQuestion };