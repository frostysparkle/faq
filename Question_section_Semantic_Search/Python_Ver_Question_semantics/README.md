# Python Integration Guide

## Purpose
This component powers semantic FAQ search using MongoDB Atlas Vector Search.

## Stack
- Python 3.10+
- pymongo
- sentence-transformers
- numpy

## Data flow
1. Load FAQ JSON.
2. Convert each question into embeddings using `all-MiniLM-L6-v2`.
3. Store documents in MongoDB Atlas.
4. Query MongoDB using `$vectorSearch`.
5. If no match is found, store the new question in `faqs_recent`.

## Collections
- `faqs_primary`: main FAQ collection.
- `faqs_recent`: recent user questions and fallback data.

## Required document shape
```json
{
  "id": "1.1",
  "question": "What is the internship?",
  "answer": "...",
  "section_number": 1,
  "section_title": "About",
  "embedding": [384 floats],
  "created_at": "2026-05-27T00:00:00Z"
}
```

## Atlas requirements
- Create a Vector Search index on `embedding`.
- Use `numDimensions: 384`.
- Use `similarity: "cosine"`.
- Create a TTL index on `created_at` for `faqs_recent` to keep only last 7 days.

## Search logic
1. Search `faqs_primary`.
2. If not found, search `faqs_recent`.
3. If still not found, insert the new question into `faqs_recent`.

## Backend contract
The backend should expose:
- `build_from_dataset()`
- `query_flow(question)`
- `insert_new_question(question)`

## Notes for DB team
- Ensure Atlas vector index exists before search.
- Ensure TTL index is enabled on `faqs_recent`.
- Keep `embedding` as an array of floats.

## Notes for backend team
- Always embed the incoming question before search.
- Return question, answer, and similarity score.
- Save unanswered questions with timestamp.