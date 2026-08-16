<!--
Sync Impact Report
- Version change: (unwritten template scaffold) → 1.0.0
- Modified principles: none (first populated version)
- Added sections: Core Principles (I–V), Performance & Efficiency Standards,
  Quality Gates & Development Workflow, Governance
- Removed sections: none
- Follow-up TODOs: none (all placeholders resolved)
-->

# File Storage System Constitution

## Core Principles

### I. Production-Grade Quality

Every feature MUST follow best coding practices and meet production-grade quality
before it is considered done. This means correct behavior, strong typing, no
known security regressions, and validation against the project's quality gates.
Quality is not optional for prototypes, spikes, or "temporary" code — shortcuts
must be flagged and removed before merge.

### II. Coding Conventions

Code MUST follow the project's established coding conventions. Where they exist,
the project guidance files (AGENTS.md, CLAUDE.md) and the patterns of surrounding
code take precedence over personal preference. Conventions cover formatting,
naming, file organization, package-manager usage (bun), and framework idioms.
New code that cannot follow an existing convention MUST be justified explicitly.

### III. Modularity

Code MUST be kept modular: small, focused units with a single responsibility,
explicit boundaries, and minimal coupling. Logic must be reusable where it is
generic, and feature-specific code must not be buried inside unrelated modules.
Modularity is a non-negotiable design constraint, not a refactoring afterthought.

### IV. Readability & Maintainability

Code MUST be readable and maintainable by other developers. Favor clear, explicit
code over clever or terse constructions; choose descriptive names; keep functions
short and self-documenting. A future maintainer MUST be able to understand what a
module does and why, without reverse-engineering it.

### V. Efficiency & Optimization (Priority)

Efficiency and optimization are a priority across the codebase. Design and
implement with performance in mind: minimize unnecessary work, avoid premature
pessimization of hot paths, batch and index database access, and avoid wasteful
client/server round trips. Optimizations MUST preserve correctness, readability,
and maintainability — profile or measure before and after meaningful changes.

## Performance & Efficiency Standards

- Database access MUST be deliberate: use selective queries, appropriate indexes,
  and batching; never issue N+1 queries or fetch columns that are unused.
- Large payloads (file metadata, folder listings) MUST be paginated or streamed,
  never loaded wholesale into memory without bound.
- Client-side code MUST avoid heavy computation on the main thread and MUST
  defer/lazy-load anything not needed for the initial render.
- Long-running or IO-bound work MUST be moved off the request/response path where
  possible (background jobs, server-side processing, caching).
- Caching MUST be applied where it provides measurable benefit and MUST be
  invalidated correctly; cache keys must cover all inputs that affect the value.
- Resource usage (connections, memory, CPU) MUST be bounded; unbounded loops,
  unchecked recursion, and un-throttled concurrency are defects.

## Quality Gates & Development Workflow

- All changes MUST pass the project's quality gates before merge: `bun run lint`,
  `bun run typecheck`, and formatting consistent with the project's formatter.
- Bun is the sole package manager and script runner. Dependencies are installed
  and scripts are executed with `bun`; mixing package managers is a violation.
- TypeScript types MUST be explicit and accurate; `any` is only acceptable with an
  explicit justification and MUST be removed as soon as the type can be expressed.
- Code reviews MUST verify compliance with this constitution, not just
  correctness. Reviewer feedback on quality, performance, or maintainability is
  binding unless explicitly overridden with rationale.
- Database schema changes MUST be applied through Prisma migrations and reviewed
  for performance impact (missing indexes, lock contention, data volume) before
  they reach production.
- Security-sensitive paths (auth, storage access, data deletion) MUST be reviewed
  with extra scrutiny: authorization checks on every access, no secrets in logs or
  client bundles, and least-privilege permissions.

## Governance

This constitution supersedes all other written and unwritten practices where they
conflict. It binds all contributors and all code merged into this repository.

- Amendments require documentation of the change, approval before taking effect,
  and (for material changes) a migration plan for existing code.
- The constitution version follows Semantic Versioning. MAJOR for incompatible
  principle removals/redefinitions, MINOR for new principles or materially
  expanded guidance, PATCH for clarifications and wording refinements.
- Compliance is checked during code review on every pull request. PRs that violate
  a principle MUST be blocked until the violation is fixed or explicitly approved.
- Guidance for day-to-day development that does not rise to constitutional level
  lives in AGENTS.md and CLAUDE.md; runtime guidance may not contradict this
  constitution.

**Version**: 1.0.0 | **Ratified**: 2026-08-15 | **Last Amended**: 2026-08-15
