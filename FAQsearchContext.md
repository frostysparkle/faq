# Semantic FAQ Search Engine — Project Context

## Project Overview

This project is a semantic FAQ search engine being built for the Vicharanashala / Summership internship FAQ system.

The goal is to allow users to ask natural language questions and retrieve the most semantically relevant FAQ answers instead of relying only on keyword matching.

The project currently uses:

- Python
- FastEmbed
- FAISS
- NumPy
- JSON FAQ dataset

Core idea:
Convert FAQ questions + answers into vector embeddings and perform semantic similarity search using FAISS.

---

# Current Architecture

User Query
    ↓
Embedding Model (FastEmbed)
    ↓
Vector Embedding
    ↓
FAISS Similarity Search
    ↓
Top-K Closest FAQ Matches
    ↓
Return Relevant Answers

---

# Dataset

Main dataset file:

faqdataset_complete.json

The dataset contains:

- sections
- section titles
- question-answer pairs
- metadata

Current dataset:
- Vicharanashala Internship FAQ
- Version: v22.0.0
- Last updated: 2026-05-23

The dataset contains:
- internship policies
- NOC rules
- offer letter rules
- ViBe LMS FAQs
- Rosetta journal FAQs
- coursework FAQs
- internship structure
- attendance policies
- communication policies
- mentor/project information

---

# Current Tech Stack

## Libraries

requirements.txt:

- fastembed
- faiss-cpu
- numpy

Installation:

pip install -r requirements.txt

---

# Embedding Pipeline

## File:
main.py

Current workflow:

### 1. Load JSON dataset

```python
with open("faqdataset_complete.json", "r", encoding="utf-8") as f:
    data = json.load(f)
