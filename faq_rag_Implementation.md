# AI/RAG Implementation Documentation

## 1. Project Overview

This document describes the architecture, design decisions, implementation strategies, and optimization tradeoffs for an AI-powered FAQ + Support + Semantic Search system built on the MERN stack.

---

> ### Quick Summary
>
> **What this system does:**
> A retrieval-first support system that answers user questions using semantic search and, only when needed, an LLM via RAG.
>
> **Semantic Search:**
> User query → converted to an embedding → cosine similarity matched against stored FAQ embeddings → closest match returned. 
>
> **RAG Chatbot:**
> If similarity score is moderate (0.80–0.92) → top matching chunks retrieved from knowledge base → sent to LLM as context → grounded answer generated. LLM is never called blind.
>
> **Escalation:**
> Score below 0.80 → no generation. User is offered escalation options (ticket, community, support agent).
>
> **Cost Control:**
> High-confidence answers (>0.92) skip the LLM entirely. Useful LLM-generated answers are cached back into the knowledge base to avoid repeat API calls.

---

### Architectural Summary 


| Component | Details |
|---|---|
| Retrieval Strategy | Semantic Search → Cosine Similarity Threshold |
| Embedding Model | |
| Vector Store | MongoDB (embedded vectors) |
| LLM Trigger | Only when similarity score 0.80 – 0.92 |
| Escalation | Score < 0.80 or manual user request |
| Answer Caching | Selective — store reusable LLM answers |
| Infrastructure | CPU-only |
| AI Pipeline Option | Node.js (required) / Python microservice  |
| Chunking Strategy | 300–800 characters, 10–15% overlap |
| Tag Filtering | Optional enhancement — future iteration |
| TF-IDF Hybrid | Optional enhancement — future iteration |

### 1.1 Goals

The primary goals of this system are:

- Reduce repeated, redundant questions from users
- Reduce unnecessary LLM/external API calls
- Minimize computational cost and infrastructure overhead
- Improve semantic search accuracy for FAQ retrieval
- Provide intelligent, context-aware FAQ matching
- Avoid hallucinations through retrieval-first architecture
- Operate efficiently on CPU-only infrastructure
- Support scalable future RAG (Retrieval Augmented Generation) implementation

## 2. AI Features Used

AI is strategically integrated at two critical layers of this system. Both layers are designed to minimize unnecessary computation while maximizing retrieval accuracy and response quality.

---

### 2.1 Semantic Search

Semantic search forms the **retrieval backbone** of this system. Rather than relying on exact keyword matches, the system understands the *meaning* of a user query and finds semantically similar questions from the knowledge base.

**How it works:**

- User queries are converted into dense vector representations (embeddings)
- These embeddings capture the semantic meaning of the query
- Cosine similarity is computed between the query embedding and all stored embeddings
- The most semantically similar FAQ entries are retrieved and ranked
- Embeddings are stored persistently in MongoDB alongside their source content
<!-- - Lightweight embedding models are preferred to keep CPU inference fast -->

**Semantic Search Flow:**

```
User Query
    │
    ▼
Generate Query Embedding
    │
    ▼
Cosine Similarity Search over Stored Embeddings
    │
    ▼
Ranked FAQ Results (by similarity score)
    │
    ▼
Apply Threshold Decision Engine
```

> **Engineering Note:** Storing embeddings is a one-time cost per FAQ entry. Retrieval via cosine similarity is computationally cheap compared to calling an external LLM API for every query. This trade-off forms the economic foundation of the system's cost reduction strategy.

---

### 2.2 RAG-Based Chatbot

A lightweight RAG chatbot is implemented as the secondary response layer, activated only when direct semantic retrieval is insufficient.

**Architecture Principles:**

- The chatbot is **retrieval-first** — LLM generation is always secondary
- Before generating any response, the system retrieves relevant FAQ chunks and knowledge base documents
- The LLM is provided retrieved context as a grounded prompt
- When retrieval confidence is low, the system escalates rather than generates uncertain answers

**Retrieval Sources for RAG:**

- Stored FAQ question-answer pairs
- Knowledge base document chunks
- Previously generated and cached LLM answers (if stored back)

This system is **not** designed as a fully generative AI chatbot in its initial iteration. 

```
┌───────────────────────────────────────────────────────────┐
│                    User Query                             │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│              Embedding Generation Layer                   │
│         (Sentence Transformers / all-MiniLM-L6-v2)        │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│           Vector Similarity Search (MongoDB)              │
│              Cosine Similarity Calculation                │
└─────────────────────────┬─────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
      Score > 0.92   0.80 – 0.92    Score < 0.80
          │               │               │
   Return Cached    RAG + LLM       Escalate /
     Answer         Pipeline       I don't know
```

---


> **Critical Requirement:** LLM generation must always be preceded by retrieval. The system must never call an LLM with no retrieved context if a relevant FAQ or knowledge chunk exists.

---

## 3. Technology Choices and Implementation Discussion

Given the MERN stack constraint, there are two possible approaches for implementing the AI pipeline. Both are documented here for evaluation.

---

### 3.1 Option 1: Node.js-Based AI Implementation

Implementing the AI pipeline directly within the Node.js/Express.js backend.

**Advantages:**

- Unified MERN architecture — no separate service required
- Simpler deployment pipeline (single process or container)
- Easier integration with existing Express.js API routes
- No inter-service communication overhead
- Reduced DevOps complexity

**Disadvantages:**

- The Node.js AI/ML ecosystem is significantly weaker compared to Python
- Fewer mature, optimized libraries for transformer-based embeddings
- CPU inference for embedding generation may be slower or harder to optimize
- Model batching and memory management are more complex in Node.js
- Fewer options for GPU acceleration if the project scales
- Node.js is not the industry-standard ecosystem for production AI pipelines

**Available Libraries (Node.js):**

| Library | Purpose | Maturity |
|---|---|---|
| `@xenova/transformers` | Transformer inference in Node.js | Moderate |
| `onnxruntime-node` | ONNX model inference | Moderate |
| `langchain` (JS) | RAG pipeline orchestration | Early-stage |
| `faiss-node` | Vector similarity search | Limited |

> **Implementation Note:** Despite these disadvantages, a Node.js-based implementation remains feasible, especially for lightweight embedding models like `all-MiniLM-L6-v2` running via ONNX. This path will be pursued if Python integration is not permitted by project constraints.

---

### Option 2: Python-Based AI Microservice (Alternative)

If allowed, a dedicated Python microservice would handle all AI/ML operations and expose REST or gRPC endpoints consumed by the Node.js backend.

**Why Python is Superior for AI Pipelines:**

- Industry-standard ecosystem for AI, ML, and NLP workloads
- `sentence-transformers` library provides first-class embedding support
- Mature inference libraries with CPU optimization (`ONNX Runtime`, `ctransformers`, `llama-cpp-python`)
- Easier model management, batching, and concurrency handling
- Faster iteration and experimentation with new models
- Native `faiss` and `chromadb` support for vector search


> **Decision Status:** It is currently uncertain whether a Python integration is permitted by project constraints. Both approaches are being documented. The Python microservice approach is the **recommended** alternative from an engineering perspective, But we are **bound** to use Nodejs

---

## 4. Suggested Models and AI Components

Model selection is not finalized. The following tables present evaluated options across embedding models, open-source LLMs, and API-based LLMs.

---

### 4.1 Table 1: Suggested Embedding Models

> **Recommendation:** Sentence Transformers are the preferred library for embedding generation due to their ease of use, pre-trained model availability, and strong performance on semantic similarity tasks.

| Model Name | Open Source | Embedding Dimensions | CPU Friendly | Speed | Accuracy | Computational Cost | Recommended for Semantic Search | Recommended for Our Use Case |
|---|---|---|---|---|---|---|---|---|
| `all-MiniLM-L6-v2` |  Yes | 384 |  Excellent | Very Fast | Good | Very Low |  Yes |  **Primary Recommendation** |
| `BGE-small-en` |  Yes | 384 |  Excellent | Fast | Very Good | Low |  Yes |  Strong Alternative |
| `e5-small` |  Yes | 384 |  Good | Fast | Good | Low |  Yes |  Viable |
| `mpnet-base-v2` |  Yes | 768 | ⚠️ Moderate | Moderate | Excellent | Moderate |  Yes | ⚠️ Only if higher accuracy needed |

<!-- **Notes:**
- `all-MiniLM-L6-v2` is the **primary recommendation** for this system due to its balance of speed, accuracy, and minimal CPU overhead
- Higher-dimension models like `mpnet-base-v2` provide better accuracy at the cost of slower inference and higher storage requirements
- All listed models are available via the `sentence-transformers` Python library or `@xenova/transformers` for Node.js -->

---

### 4.2 Table 2: Suggested Open-Source LLMs

> **Focus:** Low-computation, CPU-friendly models are prioritized. GPU acceleration is not assumed for the initial deployment environment.

| Model Name | Parameters | CPU Usage | RAM Requirement | Response Quality | Prompt Handling | Open Source | Computational Cost | Best For | Recommended for Our System |
|---|---|---|---|---|---|---|---|---|---|
| TinyLlama | 1.1B | Very Low | ~1–2 GB | Basic | Basic |  Yes | Very Low | Lightweight tasks, quick fallbacks |  Viable for low-cost fallback |
| Phi-3 Mini | 3.8B | Low | ~3–4 GB | Good | Good |  Yes | Low | Instruction following, QA tasks |  Strong Recommendation |
| Gemma 2B | 2B | Low | ~2–3 GB | Good | Moderate |  Yes | Low | General purpose, dialogue |  Strong Recommendation |
| Qwen2.5-3B | 3B | Moderate | ~3–4 GB | Very Good | Very Good |  Yes | Moderate | Multi-lingual, structured QA |  Recommended if quality needed |
| Mistral 7B | 7B | High | ~6–8 GB | Excellent | Excellent |  Yes | High | High-quality generation tasks | ⚠️ Only if RAM budget allows |

**Notes:**
- `Phi-3 Mini` and `Gemma 2B` are the preferred candidates given the CPU-only constraint
- `Mistral 7B` delivers the best quality but requires significantly more RAM — not suitable for constrained infrastructure
- Models should be run via `llama-cpp-python` or `ctransformers` for CPU-optimized inference (Python path)
- For Node.js, `@xenova/transformers` with ONNX quantized models is the recommended path

---

### 4.3 Table 3: Suggested API-Based Models

> For cases where self-hosted inference is impractical or response quality requirements exceed what local models can deliver.

| Model / API Name | Provider | API Cost | Response Quality | Prompt Handling | Latency | Ease of Integration | Suitable for RAG | Recommended for Budget Systems |
|---|---|---|---|---|---|---|---|---|
| GPT-4o Mini | OpenAI | Low ($0.15/1M input tokens) | Very Good | Excellent | Low | Very Easy |  Yes |  **Top Recommendation** |
| Claude Haiku | Anthropic | Very Low | Good | Very Good | Very Low | Easy |  Yes |  **Top Recommendation** |
| Gemini Flash | Google | Very Low | Good | Good | Very Low | Easy |  Yes |  Strong Alternative |
| OpenRouter APIs | OpenRouter | Varies by model | Varies | Varies | Moderate | Easy |  Yes |  Good for model experimentation |

**Notes:**
- API-based models offer the best response quality with zero infrastructure overhead
- `GPT-4o Mini` and `Claude Haiku` represent the best balance of cost, quality, and latency for RAG workloads
- OpenRouter is useful for testing multiple models without managing separate API accounts
- API calls should only be triggered selectively — never on every user query

---

> **⚠️ Model Selection Notice**
>
> Model selection is **not finalized**. Additional models may be evaluated and added based on:
> - Available budget and API cost projections
> - Latency requirements per use case
> - CPU usage and infrastructure constraints
> - Scalability requirements as query volume grows
> - Deployment environment limitations
> - Response quality benchmarking results

---

## 5. RAG Pipeline Workflow

The following section describes the complete RAG pipeline from user query to final response delivery.

---

### Step 1: User Query Submission

The user submits a natural language question via the support chat interface or the semantic search box.

```
[User Interface]
      │
      │  "How do I reset my password?"
      ▼
[API Gateway / Express.js Route]
```

---

### Step 2: Embedding Generation

The user query is passed to the embedding layer, which converts it into a dense vector representation capturing its semantic meaning.

- The query string is passed to the embedding model
- The model generates a fixed-size vector (e.g., 384 dimensions for `all-MiniLM-L6-v2`)
- This vector encodes the semantic meaning of the query

**Example Embedding Model:** `all-MiniLM-L6-v2`

---

### Step 3: Semantic Search via Cosine Similarity

The generated query embedding is compared against all stored embeddings in the MongoDB knowledge base using cosine similarity.


**Search Process:**

1. Load all stored embeddings from MongoDB (or use indexed vector search)
2. Compute cosine similarity between the query embedding and each stored embedding
3. Rank results by descending similarity score
4. Return the top-N most similar entries

---

### Step 4: Similarity Threshold Decision Engine

The highest similarity score from the search results determines the system's response strategy.

| Cosine Similarity Score | Action |
|---|---|
| **> 0.92** | Return existing FAQ answer directly — no LLM call |
| **0.80 – 0.92** | Retrieve top context chunks → Pass to LLM via RAG |
| **< 0.80** | Escalate to support team or return "I don't know" |

---

#### 5.1 High Similarity Range (Score > 0.92)

When the cosine similarity score exceeds `0.92`, the system determines that the retrieved FAQ answer is semantically equivalent to what the user is asking.

**Behavior:**

- The existing FAQ answer is returned directly from the knowledge base
- **No LLM API call is made**
- Response latency is minimal (retrieval-only path)
- Computational cost is negligible

**Rationale:**

A score above 0.92 indicates that the stored FAQ question is almost identical in meaning to the user query. In this scenario, generating a new answer would be redundant and wasteful. The retrieval-only path is the most cost-efficient and fastest response mechanism.

```
Score: 0.95
  │
  ▼
Return cached FAQ answer directly
  │
  ▼
[User receives answer] ← No LLM involved
```

---

#### 5.2 Cost Reduction Optimization: Answer Caching

> **Engineering Recommendation**

For answers that are generated via LLM (RAG path), a selective **answer caching strategy** should be applied:

**Strategy:**

1. When an LLM generates a useful answer for a user query, evaluate whether the answer is stable and reusable
2. If deemed reusable, store the generated question-answer pair back into the knowledge base
3. Generate a **combined embedding** for both the question and the answer together
4. This entry becomes a new retrievable FAQ

**Benefits:**

- Future semantically similar queries can be resolved via retrieval alone (no LLM call)
- Reduces repeated API calls for common paraphrase variations
- Improves response speed for frequently asked questions
- Progressively builds a richer, self-growing knowledge base
- Reduces operational cost over time

**Implementation Flow:**

```
LLM generates answer
      │
      ▼
Is this answer stable and reusable?
      │
   Yes│                   No │
      ▼                      ▼
Store Q+A into KB         Discard after
Generate combined          serving user
  embedding
      │
      ▼
Future similar queries
resolved via retrieval only
```

> **⚠️ Caution:** This optimization should be applied **selectively** to stable, factual, domain-specific answers only. Dynamic or context-specific answers (e.g., status updates, time-sensitive info) should not be cached back into the knowledge base.

---

#### 5.3 Medium Similarity Range (Score 0.80 – 0.92)

When the similarity score falls in the medium range, the system determines that existing FAQs partially address the query but are not a sufficient direct match.

**Behavior:**

- The system enters the **RAG pipeline**
- Top-N relevant knowledge chunks are retrieved from the database
- Previous FAQ answers may also be retrieved as supporting context
- The retrieved context, combined with the user query, is sent to the LLM as a structured prompt
- The LLM generates a grounded answer based on the retrieved context

**RAG Prompt Structure:**

```
System: You are a helpful support assistant. Answer only based on the provided context.
        Do not fabricate information not found in the context.

Context:
  [Retrieved FAQ 1]
  [Retrieved Knowledge Chunk 2]
  [Retrieved Knowledge Chunk 3]

User Question: [user_query]

Answer:
```

> **Dynamic Document Support:** The knowledge base supports dynamically updatable documents. If urgent or temporary information needs to be communicated (e.g., a system outage notice, a temporary policy change), the team can inject this directly into the knowledge base without modifying the full FAQ database structure. This keeps the system flexible and operationally easier to maintain.

---

#### 5.4 Low Similarity Range (Score < 0.80)

When the cosine similarity score drops below `0.80`, the system determines that the query does not have a reliable match in the current knowledge base.

**Behavior:**

- Generating an LLM answer without grounding carries a **high hallucination risk**
- The system should **not attempt generation** in this range
- Instead, the system escalates the query

**Escalation Options:**

- Present the user with escalation options in the chat interface
- Redirect to a human support agent or admin
- Offer the user the ability to ask the community
- Trigger a support ticket submission flow
- Safely respond with a structured "I don't know" message

**Example Response:**

```
"I'm not confident I have a reliable answer for your question.
 Here are your options:
   [Ask the Community]  [Submit a Support Ticket]  [Contact Support]"
```

> **Hallucination Prevention Policy:** The system must strictly avoid generating uncertain or fabricated responses. The threshold of 0.80 is a conservative default. This value should be calibrated based on empirical testing on the actual knowledge base.

---

### 5.5 Escalation Handling

In addition to the similarity-based escalation, the system may provide users with in-chat escalation options independent of the similarity score:

- **Escalate Issue** — triggers a backend workflow to route to a human agent
- **Ask Community** — redirects to a community forum or Q&A section

Backend functions can handle these redirections as callable actions from the chatbot interface.

---

## 6. MongoDB Knowledge Chunk Structure

### 6.1 Schema Design

Each knowledge chunk stored in MongoDB follows this schema:

```json
{
  "_id": "ObjectId(...)",
  "content": "To reset your password, navigate to the login page and click 'Forgot Password'...",
  "embedding": [0.123, -0.456, 0.789, "...384 dimensions total"],
  "source": "user_manual_v2 / faq_section_account / admin_added",
  "tags": ["account", "password", "authentication"],
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```


### 6.2 Minimum Required Fields

The minimum viable implementation requires only three fields:

```json
{
  "content": "...",
  "embedding": [],
  "source": "..."
}
```

All other fields (`tags`, `createdAt`, metadata) are optional enhancements for future iterations.

---

## 7. Chunking Strategy

### 7.1 Recommended Chunk Size

| Parameter | Recommended Value |
|---|---|
| Character-based chunk size | 300 – 800 characters |
| Word-based chunk size | 100 – 200 words |
| Chunk overlap | 10% – 15% of chunk size |

### 7.2 Chunk Overlap

Chunk overlap is applied at chunk boundaries to prevent critical context from being lost at split points.

**Example:**

```
Chunk 1: [Token 1 ... Token 200]
Chunk 2: [Token 180 ... Token 380]  ← 20-token overlap with Chunk 1
Chunk 3: [Token 360 ... Token 560]  ← 20-token overlap with Chunk 2
```

**Purpose:**
- Ensures that semantically complete sentences are not split across chunks
- Maintains contextual continuity for the LLM when chunks are retrieved
- Improves retrieval accuracy for queries that span chunk boundaries

### 7.3 Chunking Considerations

- Chunks should ideally represent **self-contained, semantically complete** units of information
- Headers, section titles, and list items should not be split mid-sentence
- Very short chunks (under 100 characters) risk losing contextual richness
- Very long chunks (over 1000 characters) risk diluting the embedding representation

---


## 8. Optional Suggestions
### 8.1 Optional Tag-Based Retrieval 

A tag-based pre-filtering layer may optionally be implemented to narrow the search space before applying cosine similarity.

**Flow:**

```
User Query
    │
    ▼
Classify query into category/tag
(e.g., "account", "billing", "technical")
    │
    ▼
Filter MongoDB to chunks matching that tag
    │
    ▼
Run cosine similarity within filtered subset
    │
    ▼
Return ranked results
```

**Tradeoffs:**

| Benefit | Drawback |
|---|---|
| Faster similarity search on large datasets | Adds classification complexity |
| Reduces irrelevant results | Misclassification can miss correct answers |
| Improves precision | Requires tag maintenance discipline |

> **Recommendation:** Tag-based retrieval is an optional optimization. It adds operational complexity and is best deferred until the knowledge base grows large enough that full similarity search becomes a performance bottleneck.

---

### 8.2 TF-IDF Hybrid Search Suggestion

TF-IDF (Term Frequency-Inverse Document Frequency) may optionally be combined with semantic search to form a hybrid retrieval system.

**Use Cases:**

- Queries that contain specific technical terms, product codes, or proper nouns
- Cases where keyword matching outperforms semantic similarity (e.g., "error code 4503")
- Improving retrieval recall for keyword-heavy queries

> **Note:** TF-IDF hybrid search is a future enhancement. It adds pipeline complexity and should only be implemented once baseline semantic search performance is benchmarked and found to be insufficient for keyword-heavy queries.

---

### 8.3 Search Algorithm Improvements

- **Reranking:** Apply a cross-encoder reranker on top of initial retrieval results to improve final ranking precision (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`)
- **Hybrid Retrieval:** Combine dense vector search with sparse TF-IDF retrieval for improved recall on keyword-heavy queries
- **Approximate Nearest Neighbor (ANN) Search:** Replace brute-force cosine similarity with ANN algorithms (`FAISS`, `HNSW`) for scalability on large knowledge bases

### 8.4 Vector Search Optimization

- **Dimensionality Reduction:** Apply PCA or UMAP to reduce embedding dimensions if storage or search speed becomes a bottleneck
- **Quantization:** Use int8 quantized embeddings to reduce memory footprint while maintaining reasonable accuracy


## 9. Final Notes and Open Questions

### 9.1 Open Engineering Questions

The following decisions remain unresolved and require further research, testing, and stakeholder input:

- **Embedding model selection:** Which model provides the best domain-specific accuracy for this FAQ corpus?
- **Similarity threshold calibration:** What are the optimal thresholds (currently 0.80/0.92) for this specific knowledge base?
- **Vector retrieval strategy:** Brute-force cosine vs. ANN indexing — when does the knowledge base size justify ANN?
- **CPU-efficient parallel processing:** Best concurrency model for embedding generation under the Node.js constraint
- **Model batching:** How to batch embedding requests efficiently in a single-server CPU environment
- **Concurrent request handling:** What is the max sustainable query throughput for the chosen embedding model on the target hardware?
- **Cost vs. quality balance:** At what query volume does an API-based LLM become more cost-effective than self-hosted inference?

### 9.2 Primary System Goals (Non-Negotiable)

Regardless of implementation path, the following goals must be maintained throughout all future iterations:

| Goal | Priority |
|---|---|
| Low computation and infrastructure overhead | Critical |
| Low API/LLM call cost | Critical |
| Minimal hallucination risk | Critical |
| Scalable, modular architecture | High |
| Efficient semantic retrieval | High |
| Selective, threshold-gated LLM usage | High |
| Maintainable and updateable knowledge base | High |


---


