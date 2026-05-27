import { MongoClient } from "mongodb";

export class MongoVectorStore {
  constructor(uri, dbName, collName) {
    this.client = new MongoClient(uri);
    this.dbName = dbName;
    this.collName = collName;
    this.collection = null;
  }

  async init() {
    await this.client.connect();
    this.collection = this.client.db(this.dbName).collection(this.collName);
  }

  async upsertMany(docs, embeddings) {
    for (let i = 0; i < docs.length; i++) {
      const payload = {
        ...docs[i],
        embedding: embeddings[i],
        created_at: new Date()
      };
      await this.collection.updateOne(
        { id: payload.id },
        { $set: payload },
        { upsert: true }
      );
    }
  }

  async vectorSearch(queryVec, indexName, limit = 1, numCandidates = 100) {
    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: "embedding",
          queryVector: queryVec,
          numCandidates,
          limit
        }
      },
      {
        $project: {
          _id: 0,
          id: 1,
          question: 1,
          answer: 1,
          section_number: 1,
          section_title: 1,
          created_at: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];
    return await this.collection.aggregate(pipeline).toArray();
  }

  async createTTLIndex(days = 7) {
    await this.collection.createIndex(
      { created_at: 1 },
      { expireAfterSeconds: days * 24 * 3600 }
    );
  }

  async createTextIndex() {
    await this.collection.createIndex({ question: "text" });
  }

  async createVectorSearchIndex(indexName, dimensions = 384) {
    const indexDef = {
      name: indexName,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            path: "embedding",
            type: "vector",
            numDimensions: dimensions,
            similarity: "cosine"
          }
        ]
      }
    };

    await this.collection.createSearchIndex(indexDef);
  }
}