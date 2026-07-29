---
name: implementation-strategy
description: "Determine the best implementation strategy for the approved technical design before coding begins. Triggers: implementation strategy, library selection, framework choice, API integration planning, technology evaluation, build approach."
---

# Implementation Strategy

## Objective

Your responsibility is to convert the approved technical design into a concrete implementation strategy.

The goal of this phase is to determine how the approved design should be implemented.

Do not begin implementation during this phase.

---

## Instructions

### 1. Understand the Approved Design

Read:

- `docs/specs/<slug>-requirements.md` (from the `brainstorm` skill)
- `docs/specs/<slug>-design.md` (from the `architecture-design` skill)

If either is missing, ask the user for the missing context directly rather than assuming.

---

### 2. Determine Implementation Strategies

List the best implementation strategies for the task.

This includes deciding which:

- Libraries
- Frameworks
- Third-party APIs

should be used to achieve the implementation.

Optionally use `WebSearch`/`WebFetch` while evaluating these options.

---

### 3. Compare the Strategies

Compare every implementation strategy with the others.

Explain the trade-offs, reasoning, and justification for each.

---

### 4. Recommend the Best Strategy

Recommend the implementation strategy that best satisfies:

- The finalized technical design
- The existing codebase

Provide detailed reasoning and justification explaining why this strategy should be selected.

---

### 5. Finalize with the User

Continue discussing implementation strategies with the user until the best strategy is approved.

---

### 6. Gather Implementation Context

After approval, if the chosen libraries/frameworks/APIs have documentation worth keeping as reference (e.g. an SDK's API reference, a migration guide), fetch it with `WebFetch` and save relevant excerpts alongside the deliverable.

---

## Deliverable

Write the implementation strategy to `docs/specs/<slug>-implementation.md` (same `<slug>` as the requirements and design docs), including:

- Implementation details (chosen libraries/frameworks/APIs and why).
- Any fetched reference material saved as part of step 6.

This is the handoff artifact the `implementation-planner` skill reads next. Tell the user the file path once written.
