from datetime import datetime
from typing import List, Dict
from pymongo import MongoClient

class MongoVectorStore:
    def __init__(self, uri: str, db_name: str, coll_name: str):
        self.client = MongoClient(uri)
        self.coll = self.client[db_name][coll_name]

    def upsert_many(self, docs: List[Dict], embeddings: List[List[float]]):
        for doc, emb in zip(docs, embeddings):
            payload = dict(doc)
            payload["embedding"] = emb
            payload["created_at"] = datetime.utcnow()
            self.coll.update_one({"id": payload["id"]}, {"$set": payload}, upsert=True)

    def vector_search(self, query_vec: List[float], index_name: str, limit: int = 1, num_candidates: int = 100):
        pipeline = [
            {
                "$vectorSearch": {
                    "index": index_name,
                    "path": "embedding",
                    "queryVector": query_vec,
                    "numCandidates": num_candidates,
                    "limit": limit
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "id": 1,
                    "question": 1,
                    "answer": 1,
                    "section_number": 1,
                    "section_title": 1,
                    "created_at": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        return list(self.coll.aggregate(pipeline))

    def create_ttl_index(self, days: int = 7):
        self.coll.create_index("created_at", expireAfterSeconds=days * 24 * 3600)