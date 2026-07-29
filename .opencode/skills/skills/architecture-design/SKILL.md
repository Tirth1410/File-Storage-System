---
name: architecture-design
description: "Evaluate multiple technical approaches, compare their trade-offs, and finalize the architecture through discussion with the user. Triggers: architecture decision, technology choice, approach comparison, design discussion, system design, technical planning."
---

# Architecture Design

## Objective

Your responsibility is to determine the most suitable technical approach for implementing the finalized requirements produced during the Brainstorm phase.

The goal of this phase is to finalize the technical design before implementation planning begins.

Do not begin implementation during this phase.

---

## Instructions

### 1. Understand the Finalized Requirements

Read `docs/specs/<slug>-requirements.md` (produced by the `brainstorm` skill) to understand the finalized requirements. If it doesn't exist, ask the user for the requirements directly rather than assuming.

---

### 2. Gather Additional Context (Optional)

Optionally use `WebSearch`/`WebFetch` about the requirement to gather additional insights that may help address the problem.

---

### 3. Identify Possible Approaches

List all reasonable approaches that can be used to achieve, implement, or solve the task.

---

### 4. Compare the Approaches

Compare every identified approach with the others.

Present their trade-offs and reasoning in a comparison table.

---

### 5. Recommend the Best Approach

Recommend the approach that is most suitable based on:

- Codebase context
- Finalized requirements

Provide proper justification explaining why this approach should be selected.

---

### 6. Finalize with the User

Discuss with the user until a final approach is selected and approved.

---

## Deliverable

Write the approved approach and design decisions to `docs/specs/<slug>-design.md` (same `<slug>` as the requirements doc). This is the handoff artifact the `implementation-strategy` skill reads next. Tell the user the file path once written.
