require('dotenv').config();
const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const { ChromaClient } = require('chromadb');

const Document = require('./models/Document');

async function resetAllData() {
  console.log('🧹 Starting complete data wipe...');

  // 1. Wipe MongoDB
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    const result = await Document.deleteMany({});
    console.log(`✅ MongoDB: Deleted ${result.deletedCount} documents.`);
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
  }

  // 2. Wipe Neo4j Graph Database
  try {
    console.log('Connecting to Neo4j...');
    const driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
    );
    const session = driver.session();
    await session.run('MATCH (n) DETACH DELETE n');
    await session.close();
    await driver.close();
    console.log('✅ Neo4j: Deleted all graph nodes and relationships.');
  } catch (err) {
    console.error('❌ Neo4j Error:', err.message);
  }

  // 3. Wipe ChromaDB Vector Collection
  try {
    console.log('Connecting to local ChromaDB...');
    const client = new ChromaClient({ path: 'http://localhost:8000' });
    await client.deleteCollection({ name: 'orgmind_docs_v2' });
    console.log('✅ ChromaDB: Deleted all vector embeddings.');
  } catch (err) {
    console.log('ℹ️ ChromaDB: Collection did not exist or server is off. Skipping.');
  }

  console.log('\n✅ EVERYTHING WIPED. The system is completely fresh.');
  process.exit(0);
}

resetAllData();
