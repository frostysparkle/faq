# Samagama Internship Portal Enhancement - GEMINI.md

This is the central instruction and context file for the Samagama Internship Portal Enhancement project. It defines the project's purpose, architecture, technology stack, and development workflows.

## Project Overview

The Samagama Internship Portal Enhancement is a MERN-based module designed to resolve student support challenges through organized FAQ discovery, moderated community Q&A, and a RAG-powered chatbot. It replaces the current static FAQ and unreliable chatbot with a dynamic, state-aware system.

- **Primary Goal:** Reduce repetitive support load and provide students with verified, contextual answers.
- **Core Technology:** MongoDB Atlas (Database + Vector Search), Node.js/Express (Backend), React/Vite (Frontend), Gemini API (LLM).

## Project Structure

The project is organized into three main functional areas:

- **`frontend/`**: React-based user interface for students, moderators, and admins.
- **`backend/`**: Express.js API server (Orchestrator) for business logic, auth, and database management. *Currently in a documentation-heavy phase.*
- **`rag/`**: Documentation for the RAG pipeline and an isolated stateless LLM server (Compute Engine).

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, TanStack Query (v5), Axios, React Hook Form, Zod, Vanilla CSS |
| **Backend** | Node.js 20, Express 5, MongoDB Atlas, Mongoose, JWT, bcrypt |
| **AI / RAG** | MongoDB Atlas Vector Search, Gemini API (or Local Llama), Isolated Node.js LLM Server |
| **Validation** | Zod (shared across layers) |

## Building and Running

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Runs on port 5173 by default)

### Backend
*Note: Implementation files are currently being integrated based on `backend/BACKEND_API_CONTRACTS.md`.*

### RAG LLM Server
1. `cd rag/llm-server`
2. `npm install`
3. `npm start` (Runs on port 5000 by default)

## Development Conventions

### General
- **Single Source of Truth:** All persistent data and system state must reside in MongoDB.
- **Surgical Updates:** When modifying existing code, adhere strictly to the established style and patterns.
- **Documentation First:** Refer to `initial_implementation_doc.md` (PRD) and `backend/BACKEND_API_CONTRACTS.md` for architectural guidance.

### Frontend (`frontend/src/`)
- **Feature-Based Architecture:** Logic is grouped by feature in `src/features/` (e.g., `faq`, `auth`, `admin`). Each feature contains its own `api.ts` and `queries.ts`.
- **UI Primitives:** Use components in `src/components/ui/` for consistency.
- **Styling:** Prefer Vanilla CSS with variables defined in `src/styles/globals.css`.
- **Type Safety:** Use TypeScript rigorously and avoid `any`.

### Backend & API
- **Contracts:** All API implementations must align with `backend/BACKEND_API_CONTRACTS.md`.
- **Orchestration:** The backend acts as the orchestrator between the frontend and the RAG/LLM services.

### RAG & AI
- **Grounded Answers:** Every chatbot response must be grounded in verified content from MongoDB.
- **Stateless LLM Server:** The LLM server should remain stateless, acting only as a compute engine for generating embeddings or completions.

## Key Documentation
- `initial_implementation_doc.md`: The Product Requirements Document (PRD).
- `why_this_project.md`: Problem analysis and root-cause research.
- `backend/BACKEND_API_CONTRACTS.md`: Technical specification for the backend.
- `rag/rag-detailed.md`: Architectural blueprint for the RAG system.
