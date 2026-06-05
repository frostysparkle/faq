### Executive Summary

**What we are doing:**
We are adopting a "Single Source of Truth" architecture. MERN application's MongoDB database will handle everything. The LLM server will be stripped of all memory, state, and databases, acting purely as a high-powered, stateless "Compute Engine."

**What it means for the Backend Team:**
You own the data and the logic. You will use MongoDB's Vector Search to store and retrieve FAQs and queries. When a user asks a question, your Node.js server will search the database, bundle the retrieved documents with the user's chat history, and send one complete package to the LLM. You also handle the logic for user eligibility, ticket creation, and automatic data expiry via MongoDB TTL indexes.

**What it means for the LLM / Integration Team:**
Your job becomes much simpler. You do not need to build CRUD APIs, manage data syncing, or write cron jobs. You will host A llm using LMStudio, on the isolated server, wrap it in a lightweight API (like FastAPI or Express), and wait for the backend to send you text. You process the text, return the answer, and immediately forget the interaction happened.

---

### Architectural Blueprint: Centralized MongoDB & Stateless LLM

This document outlines the workflows, implementation responsibilities, and exact API contracts required to implement a centralized database RAG architecture.

#### 1. System Overview

- **The Orchestrator (Main Node.js Server):** Manages user sessions, chat history, database queries (Vector Search), and ticket creation.
- **The Single Database (MongoDB Atlas):** Stores user data, application state, static FAQs (no expiry), and recent queries (Queries with answers verified by mods , with a 7-day automatic expiry).
- **The Compute Node (Isolated LLM Server):** Runs the local LLM model. Accepts large text prompts, generates responses, and maintains zero local state.

#### 2. Core Workflows

**A. The Standard Chat Workflow (RAG)**

1. User types a message in the frontend.
2. The Main Backend receives the message and converts it into a vector embedding.
3. The Main Backend executes a `$vectorSearch` in MongoDB to find relevant FAQs and recent queries (>80% similarity).
4. The Main Backend assembles a single payload containing: system instructions, the retrieved MongoDB documents, the conversation history, and the user's new question.
5. The Main Backend sends this payload to the LLM Server's `/generate` endpoint.
6. The LLM Server reads the context, generates the answer (or fallback text), and returns it.
7. The Main Backend saves the response to the user's chat history(Redis Cache , statys active till 30 mins after chat closes) and sends it to the frontend.

**B. The Escalation Workflow (`#escalate` / `#forceescalate`)**

1. User types `#escalate`(for fallback) or `#forceescalate [reason]`(if user is unsatisfied with chatbot response).
2. The Main Backend intercepts this command (it never searches MongoDB for this).
3. The Main Backend verifies if the user is allowed to escalate(for #escalate only).
4. The Main Backend packages the recent chat history and the force-escalation reason (or escalation) and sends it to the LLM Server's `/summarize` endpoint.
5. The LLM Server generates a strict JSON object containing a summary of the issue and a boolean flag indicating if it is a general question.
6. The LLM Server returns the JSON.
7. The Main Backend receives the JSON, attaches the user's ID, inserts the new ticket into the MongoDB tickets collection( or attaches it to an existing open ticket of query is similar i.e., >99% similar), and alerts the frontend.

#### 3. Backend Implementation Requirements (Node.js & MongoDB)

To make this work, the backend team must implement the following database features:

- **Vector Embeddings:** The backend must generate embeddings(questions only , not for responses or answers) for every new FAQ and successfully answered user query. This can be done using a lightweight Node.js library (like `Transformers.js`) or by calling an external embedding API.
- **MongoDB `$vectorSearch`:** The database must be configured with vector indexes to allow rapid cosine similarity searches across the text fields.
- **TTL (Time-To-Live) Indexes:** To recreate the "7-day expiry" rule, the backend team must create a TTL index on the `queries` collection. MongoDB will automatically delete documents in this collection 168 hours (7 days) after their creation timestamp.

---

#### 4. LLM Server API Specifications

The isolated LLM server only needs to expose two secure endpoints to the Main Backend. Both should be secured via HTTPS and an internal Bearer token.

##### API 1: Generate RAG Response

Used for all standard user questions. The backend does the searching; the LLM does the reading.

- **Endpoint:** `POST /internal/llm/generate`
- **Headers:** `Authorization: Bearer <internal_secret>`
- **Request Payload (From Main Server):**

```json
{
  "system_instruction": "You are a helpful support bot. Use ONLY the provided context to answer. If the answer is not in the context, reply EXACTLY with: 'I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate'.",
  "rag_context": [
    "FAQ: To change your billing cycle, go to Settings > Billing and select 'Update Plan'.",
    "Query: How do I downgrade? Answer: You can downgrade from the Billing menu."
  ],
  "conversation_history": [
    { "role": "user", "content": "Hi, I need help with my account." },
    { "role": "assistant", "content": "Hello! What kind of help do you need?" }
  ],
  "current_message": "Where is the billing menu located?"
}
```

- **Response Payload (From LLM Server):**

```json
{
  "status": "success",
  "data": {
    "response_text": "You can find the billing menu by going to Settings and then selecting Billing.",
    "fallback_triggered": false
  }
}
```

_(Note: If the LLM uses the exact fallback string, it should set `fallback_triggered: true` so the backend knows to unlock the `#escalate` feature for the user's next message)._

##### API 2: Summarize for Escalation

Used when the user triggers an escalation. Forces the LLM to output structured JSON for the backend to use in ticket creation.

- **Endpoint:** `POST /internal/llm/summarize`
- **Headers:** `Authorization: Bearer <internal_secret>`
- **Request Payload (From Main Server):**

```json
{
  "escalation_type": "force_escalate",
  "force_reason": "The portal won't let me click the save button.",
  "conversation_history": [
    { "role": "user", "content": "How do I update my billing cycle?" },
    { "role": "assistant", "content": "Go to settings > billing > update it and click save." }
  ]
}
```

- **Response Payload (From LLM Server):**

```json
{
  "status": "success",
  "data": {
    "summary": "User is attempting to change their billing cycle but reports that the save button in the portal is unresponsive.",
    "is_general_query": false
  }
}
```

_(Note: The LLM Server must use Grammar/JSON Schema constraints within `llama.cpp` to ensure the output perfectly matches this JSON structure every single time, avoiding plain text conversational filler)._
