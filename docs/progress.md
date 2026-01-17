# Progress.md — Distributed Object Storage

This document is the **single source of truth** for the system design.  
It captures **problem context, constraints, invariants, failure handling, and the current execution architecture**.

The system is built using a **failure-driven, correctness-first methodology**.

---

## 1. Problem Statement

Design a **single-region, fault-tolerant object storage system** that remains correct under:

- Network failures  
- Process crashes  
- Concurrent operations  
- Disk-level failures  

Primary goals:

- Correctness  
- Durability  
- Concurrency safety  
- Operational clarity  

Explicit non-goals:

- Global scale  
- Multi-region replication  
- CDN / edge delivery  
- Background orchestration  

---

## 2. Scope & Constraints

- Single region  
- Two developers  
- Local infrastructure  
- Limited budget  

Design philosophy:

> **Correctness → Concurrency → Durability → Observability → Performance → Scale**

---

## 3. Naïve Baseline

```
Client → Single Service → Single Storage
```

Problems:

- Whole-file uploads  
- No resumability  
- No crash recovery  
- Metadata and data tightly coupled  

Purpose: create a baseline that **fails clearly**.

---

## 4. Failure-Driven Methodology

For every failure:

1. Identify user-visible break  
2. Identify broken invariant  
3. Make invariant explicit  
4. Design retry-safe, crash-safe flow  
5. Ensure deterministic recovery after restart  

Key principle:

> A system is correct only if it remains correct after restart.

---

## 5. Failure Scenarios

1. Network failure during upload  
2. Server crash  
3. Atomic file visibility  
4. Concurrency  
5. Database crash  
6. Disk crash  
7. Duplicate uploads  
8. High-latency reads  
9. Observability gaps

---

## 6. Network Failure — SOLVED

- Chunked uploads  
- Persistent upload sessions  
- Chunk-level idempotency  

Uploads resume from last stored chunk.

---

## 7. Server Crash — SOLVED

- Session state stored durably  
- No reliance on in-memory state  
- Retry-safe chunk writes  

Crash → restart → resume safely.

---

## 8. Atomic File Visibility — SOLVED

Files are never visible until fully durable.

### File States

```
IN_PROGRESS → FINALIZING → AVAILABLE
```

Invariant:

```
File.AVAILABLE ⇒ final file exists on all replicas
```

---

## 9. Concurrency — SOLVED

Handled through **state machines and row-level locks**, not in-memory locks.

- Chunk identity = `(session_id, seqnum)`  
- Duplicate writes are ignored  
- Finalization is idempotent  
- Reads only see `AVAILABLE` files  

---

## 10. Database Crash — SOLVED

- Atomic metadata updates  
- Disk-first, DB-second ordering  
- Restart-driven reconciliation  

Invariant:

```
File.AVAILABLE ⇒ data is complete
```

---

## 11. Disk Crash — SOLVED

- Primary + Secondary storage  
- Synchronous replication  
- ACK only after both replicas are durable  

Invariant:

```
AVAILABLE ⇒ data exists on all replicas
```

---

## 12. Observability — SOLVED

Durable events:

- upload_session_created  
- chunk_persisted_primary  
- chunk_duplicate_rejected  
- finalization_started  
- finalization_replication_failed  
- file_became_available  

Operators can always answer:
- What failed?  
- Why?  
- Where?

---

## 13. High-Latency Reads — SOLVED

### Problem
Repeated disk reads + contention → slow downloads.

### Solution
Read-through whole-file cache.

Rules:
- Only `AVAILABLE` files  
- Best-effort  
- Read-only  
- Non-fatal on failure  
- LRU eviction  

---

## 14. Current Architecture

- Upload Service (sessions, chunks, finalization)  
- Download Service (auth + reads)  
- PostgreSQL (metadata)  
- Primary + Secondary object storage  
- Read cache  

---

## 15. Database Design

### Object Store (Binary)

| Object       | Purpose                   |
|--------------|---------------------------|
| chunk_path   | Temporary uploaded chunks |
| final_path   | Assembled immutable file  |

Chunks are deleted after finalization (GC later).

---

### PostgreSQL (Metadata)

#### Users
```
id (PK)
username
password_hash
```

#### File
```
id (PK)
status ENUM(IN_PROGRESS, FINALIZING, AVAILABLE)
final_path
owner_id (FK → Users.id)
created_at
```

#### FileUserInfo (Sharing / ACL)
```
user_id (FK → Users.id)
file_id (FK → File.id)
role ENUM(OWNER, EDITOR, VIEWER)
```

#### Session
```
id (PK)
file_id (FK → File.id)
user_id (FK → Users.id)
status ENUM(ACTIVE, COMPLETED)
total_chunks
chunk_size
created_at
expires_at
```

#### SessionChunk
```
session_id (FK → Session.id)
seqnum
chunk_path
checksum
status ENUM(STORED)
PRIMARY KEY (session_id, seqnum)
```

---

## 16. System Invariants

```
File.AVAILABLE ⇒ final_path exists on both replicas
File.FINALIZING ⇒ finalization is in progress and recoverable
Session.COMPLETED ⇒ no more chunk writes allowed
(session_id, seqnum) uniquely identifies a chunk
SessionChunk.STORED ⇒ chunk_path exists on disk
```

---

## 17. Execution Model (Disk-First)

All durable data flows follow:

```
write → fsync → rename → DB commit
```

Disk is always written **before** metadata is updated.

---

## 18. Finalization Protocol

Finalization is two-phase with an explicit `FINALIZING` state.

### Phase 1 — Freeze
```
BEGIN
  SELECT Session FOR UPDATE
  validate all chunks exist
  UPDATE File SET status = FINALIZING
COMMIT
```

### Phase 2 — Build (no DB)
```
assemble chunks → temp_final
fsync(temp_final)

replicate → temp_final_replica
fsync(temp_final_replica)

rename both to final paths
```

### Phase 3 — Make Visible
```
BEGIN
  UPDATE File SET status = AVAILABLE
  UPDATE Session SET status = COMPLETED
COMMIT
```

Crash at any point is recoverable using the `FINALIZING` marker.

---

## 19. System Status

| Failure            | Status |
|--------------------|--------|
| Network            | SOLVED |
| Server crash       | SOLVED |
| Atomic visibility  | SOLVED |
| Concurrency        | SOLVED |
| DB crash           | SOLVED |
| Disk crash         | SOLVED |
| Observability      | SOLVED |
| High-latency reads | SOLVED |

## 20. Recovery Procedures (Actionable)

### On boot / restart
1. Run DB migrations if needed.  
2. Reconcile `FINALIZING` files:
   - For each File.status == FINALIZING:
     - Verify final file presence on primary + secondary.
     - If both present → set File.status = AVAILABLE, set Session.status = COMPLETED.
     - If missing → re-run Phase 2 assembly/replication or mark for manual recovery.
3. Sweep any temp chunk files older than TTL (configurable) into an orphan bucket for manual inspection.

### Emergency manual steps
- To recover a stuck finalization, inspect `finalization_started` logs and re-run Phase 2 assembly on a safe node.  
- To remove orphaned chunks, run a DB vs storage reconciliation job (deferred to GC).

---

## 21.  ACL

- All API calls require authentication (JWT)  
- File-level ACLs stored in FileUserInfo table  
- Upload session bound to uploader's user_id (only owner can finalize or delete)  
- Signed pre-signed URLs for direct downloads (short TTL)  
