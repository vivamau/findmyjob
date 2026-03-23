# Architectural Decisions

## Vector Database Selection

**Date:** 2026-03-23
**Context/Problem:**
We wanted to facilitate and improve the search of jobs within the application by introducing semantic search, vector search, and hybrid search capabilities. This would allow finding jobs based on meaning and context rather than just keyword matching, and potentially matching candidate Resumes (CVs) to Job Descriptions.

**Evaluated Alternatives:**
1. **Qdrant:** A robust vector database, but requires deploying and managing a separate server or Docker container.
2. **`sqlite-vec` / `sqlite-vss`:** Native vector search extensions for SQLite, allowing vectors to live alongside existing relational data.
3. **LanceDB:** A standalone, embedded vector database built specifically to be simple ("the SQLite of vectors"). It stores data locally in an optimized columnar format (Apache Lance) and natively integrates with Node.js and Python.

**Decision:**
We decided to proceed with **LanceDB** (or a similar embedded vector setup) as our vector database engine.
Because the project currently uses SQLite as its primary relational database, adopting an embedded vector database like LanceDB perfectly aligns with the project's lightweight, zero-configuration philosophy. It allows us to manage vectors and perform similarity searches directly within the Node.js backend without the overhead of additional infrastructure or vendor lock-in.

**Status:**
Accepted and pending implementation.
