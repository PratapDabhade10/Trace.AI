const { ChromaClient } = require('chromadb');

let collection = null;

async function getCollection() {
  if (collection) return collection;

  const client = new ChromaClient({ path: 'http://localhost:8000' });

  try {
    collection = await client.getOrCreateCollection({
      name: 'orgmind_docs',
      metadata: { 'hnsw:space': 'cosine' }
    });
    console.log('✅ ChromaDB collection ready');
  } catch (err) {
    console.warn('⚠️  ChromaDB not available, using MongoDB text search as fallback');
    collection = null;
  }

  return collection;
}

async function addToChroma(docId, embedding, content, metadata) {
  try {
    const col = await getCollection();
    if (!col) return;
    await col.add({
      ids: [docId],
      embeddings: [embedding],
      documents: [content],
      metadatas: [metadata]
    });
  } catch (err) {
    console.warn('ChromaDB add failed:', err.message);
  }
}

async function queryChroma(embedding, nResults = 4) {
  try {
    const col = await getCollection();
    if (!col) return [];
    const results = await col.query({
      queryEmbeddings: [embedding],
      nResults
    });
    return results.ids[0] || [];
  } catch (err) {
    console.warn('ChromaDB query failed:', err.message);
    return [];
  }
}

module.exports = { addToChroma, queryChroma };