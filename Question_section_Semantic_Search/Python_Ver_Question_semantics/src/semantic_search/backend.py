import time
from datetime import datetime
from typing import Dict

from .config import (
    MONGODB_URI, DB_NAME, COLL_1, COLL_2,
    VECTOR_INDEX_1, VECTOR_INDEX_2, SIM_THRESHOLD,
    LAST_7_DAYS, DATA_PATH
)
from .utils import load_and_flatten
from .embeddings import Embedder
from .mongo_store import MongoVectorStore

class SemanticBackend:
    def __init__(self):
        self.embedder = Embedder()
        self.mongo1 = MongoVectorStore(MONGODB_URI, DB_NAME, COLL_1)
        self.mongo2 = MongoVectorStore(MONGODB_URI, DB_NAME, COLL_2)

    def build_from_dataset(self):
        docs = load_and_flatten(DATA_PATH)
        embeddings = self.embedder.encode_texts([d["question"] for d in docs])

        split = len(docs) // 2
        docs1, emb1 = docs[:split], embeddings[:split]
        docs2, emb2 = docs[split:], embeddings[split:]

        self.mongo1.upsert_many(docs1, emb1)
        self.mongo2.upsert_many(docs2, emb2)

        self.mongo1.create_ttl_index(LAST_7_DAYS)
        self.mongo2.create_ttl_index(LAST_7_DAYS)

        print(f"Inserted {len(docs1)} docs into {COLL_1}")
        print(f"Inserted {len(docs2)} docs into {COLL_2}")
        print("TTL indexes created for both collections.")

    def query_flow(self, question: str):
        query_vec = self.embedder.encode_one(question)

        print("\n" + "=" * 70)
        print("QUESTION:", question)
        print("=" * 70)

        print("\n[1] Searching collection 1...")
        res1 = self.mongo1.vector_search(query_vec, VECTOR_INDEX_1, limit=1)
        if res1 and res1[0]["score"] >= SIM_THRESHOLD:
            self.flash(res1[0], "collection 1")
            return res1[0]

        print("\n[2] Searching collection 2...")
        res2 = self.mongo2.vector_search(query_vec, VECTOR_INDEX_2, limit=1)
        if res2 and res2[0]["score"] >= SIM_THRESHOLD:
            self.flash(res2[0], "collection 2")
            return res2[0]

        print("\n[3] No match found. Saving question to collection 2...")
        new_doc = {
            "id": f"new_{int(time.time() * 1000)}",
            "question": question,
            "answer": None,
            "section_number": None,
            "section_title": "new_questions",
            "embedding": query_vec,
            "created_at": datetime.utcnow()
        }
        self.mongo2.coll.insert_one(new_doc)
        print("Saved to collection 2.")
        return None

    def flash(self, result: Dict, source: str):
        print("\n" + "🎉" * 20)
        print(f"FOUND IN {source.upper()}")
        print(f"Question: {result['question']}")
        print(f"Answer: {result['answer']}")
        print(f"Similarity: {result['score']:.3f}")
        print("🎉" * 20)