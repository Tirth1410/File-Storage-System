# Requirements

## Functional Requirements

- Support chunked uploads for files up to 1 GB, allowing uploads to resume from the last successfully persisted chunk after client or server failures.
- Ensure file durability and continued accessibility after the failure of any single storage node.
- Optimize read performance for frequently accessed files using an edge-style caching layer to reduce origin storage load and improve download latency.
- Enable secure file sharing through permission-scoped, expiring links (read-only or upload-only), with access events logged for auditability.
- The system must provide sufficient observability (logs, basic metrics, health checks) to diagnose failures and understand system behavior.

## Non-Functional Requirements

- Concurrent Users able to upload/Download
- Low Latency
- The system should degrade gracefully under partial failures and avoid complete unavailability due to the failure of a single component.

### Scale Requirements

- DAU - 10 Persons
- Average Daily Uploads - 200 MB
- Daily Requirement - 2 GB

## User visible Behavior

- Users can upload large files; if a network interruption occurs, uploads resume from the last successfully uploaded chunk.
- After a successful upload, files remain downloadable even if a single storage node fails.
- Frequently accessed files download with lower latency due to edge caching.
- Users can securely share files using permission-scoped, expiring links and revoke access when needed.
- When operations fail, users receive clear error messages that support safe retries.

## Failure Scenario

### Handle Failures

- Data loss due to Network    |     Server Crash before processing |   Duplicate Data chunks
- Storage node failure leading to partial data unavailability.
- Excessive request rates from misbehaving clients (basic rate limiting only).
- Unauthorized Access Due to Link Expiration/Invalidation.
- Loss of observability due to logging service failure (best-effort handling).

### Out-of-Scope Failures

- Scalability
- Unlimited Storage
- 5-nine SLA uptime
- Massive Parallelism

## Component Responsible

- Upload Failure → Upload Service
- File Lost → Meta Data Service
- Too Many Request → API Gateway
- Unauthorized Access → Auth service
- Failure Capturing Log → Log Service