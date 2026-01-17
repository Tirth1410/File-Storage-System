# Implementation

# Choices

## Why Go + PostgreSQL

This system is not a typical web backend; it is a **storage-oriented, failure-driven system** that must remain correct under crashes, concurrency, and partial failures. The technology stack must therefore provide **strong control over concurrency, disk I/O, and transactional state**.

### Why Go

Go is selected because it aligns directly with the operational nature of this system.

1. **Built for concurrent services**
    
    Upload sessions, chunk writes, retries, and finalization can all occur concurrently. Go’s goroutine and channel model allows these operations to be expressed naturally without complex thread management or event-loop frameworks. This makes it easier to build idempotent, race-free state machines.
    
2. **First-class support for low-level I/O**
    
    The design relies on:
    
    - writing to disk
    - calling `fsync`
    - performing atomic `rename`
    - detecting partial writes after crashes
    
    Go’s standard library provides direct, predictable access to the operating system’s file APIs. Nothing is hidden behind abstractions that could break durability or ordering guarantees.
    
3. **Explicit error handling**
    
    Every disk write, DB transaction, and network operation must be verified. Go forces errors to be handled explicitly, which is essential in a system where silent failures lead to data corruption.
    
4. **Production-grade runtime**
    
    Go produces a single, statically compiled binary with low memory overhead and predictable performance. This matches how real storage services are deployed: as long-running, resilient daemons rather than short-lived scripts.
    
5. **Industry alignment**
    
    Most modern infrastructure and storage systems (Kubernetes, Docker, etcd, MinIO) are written in Go. Using Go ensures the implementation style and operational model are aligned with real-world storage platforms.
    

---

### Why PostgreSQL

PostgreSQL is chosen because the design requires:

- row-level locking (`SELECT … FOR UPDATE`)
- atomic state transitions
- crash-safe commits
- deterministic recovery

These are essential for enforcing invariants such as:

```
File.AVAILABLE ⇒ dataexistsonboth replicas

```

PostgreSQL provides these guarantees natively and transparently.