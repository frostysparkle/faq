# Gemini Project Context: Samagama Backend

## Project Overview
This directory serves as the central hub for the **Samagama Student Portal Backend**. It currently focuses on the architectural design, API contracts, and integration strategies for a production-ready Node.js and MongoDB system.

The project is designed as an orchestrator for a student support system, featuring:
- **Core Services:** User Authentication (JWT), Role-Based Access Control (RBAC), FAQ Management, and Community Q&A.
- **Data Layer:** MongoDB Atlas using Mongoose ODM, with reserved fields for vector embeddings.
- **AI Integration (Phase 6):** An upcoming RAG (Retrieval-Augmented Generation) pipeline where this backend orchestrates calls between the frontend and an external LLM/Embedding service.

## Directory Overview
As of the current state, this directory primarily contains documentation defining the "Source of Truth" for the backend implementation and its integration with the LLM team.

### Key Files
- **`BACKEND_API_CONTRACTS.md`**: The primary architectural and technical specification. It includes:
    - **System Architecture:** Overview of the technology stack (Node.js 20, Express 5, MongoDB).
    - **Database Schemas:** Detailed definitions for `users`, `faqs`, `questions`, `answers`, `chatfeedbacks`, `systemsettings`, `auditlogs`, and `flags`.
    - **API Surface:** Comprehensive list of endpoints for Auth, FAQs, Q&A, Chatbot, and Moderation.
    - **Environment Configuration:** Required variables for server startup and Phase 6 integration.
    - **Phase 6 Workflow:** Step-by-step logic for the RAG pipeline and escalation workflows.

## Usage
The contents of this directory should be used to:
1.  **Enforce API Standards:** Ensure all new development aligns with the defined endpoint signatures and data models.
2.  **Guide Phase 6 Implementation:** Follow the RAG and Escalation workflows described in the contracts when wiring the LLM/Embedding services.
3.  **Coordinate with LLM Team:** Use the "What We Need From the LLM Team" section to synchronize configuration and response schemas.

---
*Note: This project is currently in a documentation-heavy phase. Implementation files (e.g., `src/`, `package.json`) should be integrated following the standards defined in `BACKEND_API_CONTRACTS.md`.*
