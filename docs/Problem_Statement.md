# Problem Statement

## **Distributed File Storage with CDN Capabilities**

---

## 1. Background and Motivation

Modern applications require reliable storage and fast delivery of large files such as documents, media, datasets, and backups. While cloud object storage and CDNs exist, they are often:

- Overkill for small teams and startups
- Expensive and opaque in cost behavior
- Difficult to customize for specific reliability or access requirements
- Not resilient to unstable client-side network conditions

At the same time, naïve file servers fail to address:

- Network interruptions during uploads and downloads
- Single points of failure
- High latency for geographically distributed users
- Uncontrolled access to shared files
- Lack of observability into usage and failures

This project aims to design and implement a **production-grade distributed file storage system** that emphasizes **reliability, resumability, scalability, and low-latency delivery** using CDN-style edge caching.

---

## 2. Core Problem Definition

Design and implement a system that allows users to:

- Upload large files reliably over unstable networks
- Store files in a distributed and fault-tolerant manner
- Retrieve files efficiently with low latency
- Share files securely with fine-grained access control
- Observe and reason about system behavior under failure

The system must remain functional under:

- Partial network failures
- Storage node crashes
- High read traffic
- Concurrent uploads and downloads

---

## 3. Target Users

The system is intended for:

- Individuals sharing large files
- Small teams collaborating on documents or datasets
- Internal tools that require private object storage
- Applications that need resumable uploads and fast downloads

This is **not** a public cloud replacement, but a **self-managed, customizable storage platform**.

---

---

## 4. Key Challenges the System Must Address

### 4.1 Reliable Large File Uploads

- Uploads may fail mid-transfer
- Clients should resume uploads without restarting
- Server must not reprocess already uploaded data

### 4.2 Distributed Storage

- Files must be split into chunks
- Chunks must be distributed across multiple storage nodes
- Data loss from node failure must be tolerated

### 4.3 Efficient File Retrieval

- Users may request partial file ranges
- Popular files must be served quickly
- Origin storage should not be overloaded

### 4.4 Secure File Sharing

- Files must be shareable via expiring, revocable links
- Access must be controlled without exposing storage internals

### 4.5 System Observability

- Operators must understand:
    - Upload failures
    - Node health
    - Storage utilization
    - Cache effectiveness

---

## 5. Constraints

The system must:

- Operate using commodity infrastructure
- Favor simplicity over theoretical optimality
- Degrade gracefully rather than fail catastrophically
- Be understandable and operable by a small engineering team

---

## 6. Real-World Scenarios This System Should Handle

1. A user uploads a 2 GB file on a flaky network; the upload resumes after interruption.
2. A storage node crashes; files remain accessible.
3. A popular file is downloaded repeatedly; edge caches reduce origin load.
4. A shared link expires; access is immediately revoked.
5. A storage node rejoins after downtime; missing replicas are repaired.

If the system cannot handle these, it is not production-grade.

---

## 7. Success Criteria

The project is considered successful if:

- Files are reliably uploaded and retrieved under failure
- Storage nodes can be added or removed with minimal disruption
- The system demonstrates clear trade-offs between:
    - Consistency and availability
    - Storage efficiency and redundancy
    - Simplicity and scalability
- All architectural decisions are explicitly documented and justified

---

## 9. Why This Is a Strong Engineering Problem

This problem forces engagement with:

- Distributed systems fundamentals
- Network unreliability
- Failure handling
- Data durability
- Performance optimization
- Security and access control

It mirrors challenges faced in:

- Object storage systems
- CDN infrastructure
- Internal developer platforms

---

## 10. Evaluation Perspective (Interview Lens)

An interviewer should be able to ask:

- Why chunking instead of streaming uploads?
- How does the system behave when nodes fail?
- What consistency guarantees are provided?
- Why these trade-offs over alternatives?

And you should be able to answer **calmly, precisely, and defensibly**.