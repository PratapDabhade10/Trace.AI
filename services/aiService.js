const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// Extract reasoning, decision, summary, tags from raw content
async function extractReasoning(content, source) {
  const prompt = `You are analyzing a ${source} message from a company.
Extract the following as valid JSON only, no markdown, no backticks:

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
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    // Strip markdown if present
    if (text.startsWith('```')) {
      text = text.replace(/```json|```/g, '').trim();
    }
    return JSON.parse(text);
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

// Get embedding vector for a text
async function getEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
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
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('answerQuestion error:', err.message);
    throw new Error('Failed to generate answer');
  }
}

module.exports = { extractReasoning, getEmbedding, answerQuestion };