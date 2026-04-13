const neo4j = require('neo4j-driver');

let driver = null;

function getDriver() {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    console.warn('⚠️  Neo4j credentials not set, graph features disabled');
    return null;
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return driver;
}

async function storeDocumentNode(docId, title, source, decision, tags) {
  const d = getDriver();
  if (!d) return;

  const session = d.session();
  try {
    // Create Document node
    await session.run(
      `MERGE (d:Document {id: $docId})
       SET d.title = $title, d.source = $source, d.decision = $decision`,
      { docId, title, source, decision }
    );

    // Create Tag nodes and relationships
    for (const tag of tags) {
      await session.run(
        `MERGE (t:Tag {name: $tag})
         MERGE (d:Document {id: $docId})
         MERGE (d)-[:HAS_TAG]->(t)`,
        { tag, docId }
      );
    }

    // Create Decision node
    if (decision && decision !== 'No decision') {
      await session.run(
        `MERGE (dec:Decision {text: $decision})
         MERGE (d:Document {id: $docId})
         MERGE (d)-[:MADE_DECISION]->(dec)`,
        { decision, docId }
      );
    }

    console.log(`✅ Neo4j: stored node for doc ${docId}`);
  } catch (err) {
    console.warn('Neo4j store error:', err.message);
  } finally {
    await session.close();
  }
}

async function getRelatedDocuments(tags) {
  const d = getDriver();
  if (!d) return [];

  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (d:Document)-[:HAS_TAG]->(t:Tag)
       WHERE t.name IN $tags
       RETURN DISTINCT d.id as docId, d.title as title, d.source as source
       LIMIT 5`,
      { tags }
    );
    return result.records.map(r => ({
      docId: r.get('docId'),
      title: r.get('title'),
      source: r.get('source')
    }));
  } catch (err) {
    console.warn('Neo4j query error:', err.message);
    return [];
  } finally {
    await session.close();
  }
}

module.exports = { storeDocumentNode, getRelatedDocuments };