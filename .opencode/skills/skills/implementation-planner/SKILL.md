---
name: implementation-planner
description: "Implement the approved solution incrementally through logical phases while maintaining code quality and testing. Triggers: implementation, coding, feature development, phased delivery, building features, writing code, development."
---

# Implementation Planner

## Objective

Your responsibility is to implement the approved solution by following the finalized implementation design.

Implementation should be performed incrementally, one logical phase at a time.

---

## Instructions

### 1. Understand the Implementation Design

Read `docs/specs/<slug>-requirements.md`, `docs/specs/<slug>-design.md`, and `docs/specs/<slug>-implementation.md` (produced by the `brainstorm`, `architecture-design`, and `implementation-strategy` skills) to understand the approved implementation approach. If these don't exist, ask the user for the implementation plan directly rather than assuming.

---

### 2. Prepare the Branch

Check the current branch and working tree state first. Only create a new branch if there isn't already an appropriate task branch checked out — don't assume a fresh branch is needed:

- If already on a suitable task-specific branch (e.g. mid-feature work), continue on it.
- Otherwise, confirm with the user, then checkout the default branch, `git pull`, and create a new task-specific branch.

---

### 3. Plan the Implementation

Break the task into small, manageable, and logical implementation phases.

Do not consider human development cost while planning these phases.

---

### 4. Implement Each Phase

Implement each phase while maintaining proper code quality.

---

### 5. Test Each Phase

After completing a phase:

Test the implementation.

If the entire implementation is not yet complete, use:

- Dummy data
- Mock API calls
- Any other suitable approach

to validate the completed work.

---

### 6. Explain the Changes

Once the implementation has been completed with testing:

Explain:

- The implemented changes.
- Their purpose.
- The reasoning behind them from first principles.

---

### 7. Handle User Feedback

If the user requests changes for the completed phase:

- Apply the requested changes.
- Repeat the explanation.

---

### 8. Commit the Phase

After the user approves the implementation:

- Run the required linting or type checking according to the project's configuration.
- Commit the code using a concise multi-line commit message.

---

### 9. Continue Until Completion

Repeat this workflow for every implementation phase until the entire task has been completed.

---

## Per Phase Deliverable

Produce fully implemented, tested, and committed code for the completed implementation phase.
