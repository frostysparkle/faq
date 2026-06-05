# Project Overview: Single Source of Truth RAG Architecture

This directory contains the design documentation, knowledge base, and the implementation of the isolated LLM server for a Retrieval-Augmented Generation (RAG) system. The system is designed to handle FAQs for the Vicharanashala Internship (VINS) at IIT Ropar.

## Directory Overview

The project follows a "Single Source of Truth" architecture where a centralized MongoDB database manages all data and state, while an isolated LLM server acts as a stateless "Compute Engine." This decoupling simplifies the LLM integration and centralizes data management within the main backend.

## Key Files & Directories

- **`rag-detailed.md`**: Core architectural blueprint defining system components, workflows, and API contracts.
- **`knowledge_base.md`**: Comprehensive FAQ content for the Vicharanashala Internship.
- **`llm-server/`**: Implementation of the Isolated LLM Server using Express.
  - `index.js`: The API implementation.
  - `.env`: Environment configuration.
- **`test-llm-server.js`**: A script to test the LLM server endpoints.

## Building and Running

### LLM Server

1.  **Navigate**: `cd llm-server`
2.  **Dependencies**: `npm install` (already done during setup)
3.  **LM Studio**: Ensure LM Studio is running with its local server enabled (default: `http://localhost:1234`).
4.  **Start**: `npm start` (Runs on port 5000 by default).

### Testing

To verify the LLM server is working correctly:

1.  Ensure the LLM server is running.
2.  From the project root, run: `node test-llm-server.js`

## Usage

This documentation is intended for:

- **Backend Developers**: To implement the orchestrator logic, MongoDB vector search, and data management.
- **LLM/Integration Engineers**: To maintain or extend the stateless LLM server.

The architecture prioritizes a stateless LLM server to ensure high performance and ease of maintenance, with the backend team "owning" the data and logic.
