---
name: implementation-planner
description: "Implement the approved solution incrementally through logical phases while maintaining code quality and testing. Triggers: implementation, coding, feature development, phased delivery, building features, writing code, development."
---

# Implementation Planner

## Objective

Your responsibility is to implement the approved solution by following the finalized implementation design.

Implementation should be performed incrementally, one logical phase at a time.

Never execute more than one phase per prompt-response cycle.

---

## Instructions

### 1. Understand the Implementation Design

Read `docs/specs/<slug>-requirements.md`, `docs/specs/<slug>-design.md`, and `docs/specs/<slug>-implementation.md` (produced by the `brainstorm`, `architecture-design`, and `implementation-strategy` skills) to understand the approved implementation approach. If these don't exist, ask the user for the implementation plan directly rather than assuming.

---

### 2. Prepare a Fresh Branch

Before starting any phase, checkout a fresh task-specific branch from the current branch:

- Confirm with the user, then create and checkout a new task-specific branch from the current branch.
- Never continue on the current branch.

---

### 3. Plan the Phases

Break the task into small, manageable, and logical implementation phases.

Do not consider human development cost while planning these phases.

Write the phase plan to `docs/specs/<slug>-phases.md` as a checklist, e.g.:

```markdown
# Implementation Phases

- [ ] Phase 1: <description>
- [ ] Phase 2: <description>
- [ ] Phase 3: <description>
```

Present this markdown to the user before starting the first phase.

---

### 4. Implement the Current Phase

Implement only the current (first unchecked) phase while maintaining proper code quality.

Never implement more than one phase in a single prompt-response cycle.

---

### 5. Test the Phase

After implementing the phase:

Test the implementation.

If the entire implementation is not yet complete, use:

- Dummy data
- Mock API calls
- Any other suitable approach

to validate the completed work.

If any bug or issue appears during testing, resolve it recursively until all bugs are fixed and the phase passes.

---

### 6. Explain the Changes

Once the phase has been implemented and all bugs resolved:

Explain:

- The implemented changes.
- Their purpose.
- The reasoning behind them from first principles.

Then wait for the user's explicit approval before committing. Do not commit without approval.

---

### 7. Handle User Feedback

If the user requests changes for the completed phase:

- Apply the requested changes.
- Re-run tests and resolve any resulting bugs.
- Repeat the explanation.
- Wait again for the user's approval.

---

### 8. Commit the Phase

After the user approves the phase:

- Run the required linting or type checking according to the project's configuration.
- Commit the code using a concise multi-line commit message.

---

### 9. Update the Phase Plan Markdown

After committing, update `docs/specs/<slug>-phases.md` to mark the completed phase as done, e.g.:

```markdown
- [x] Phase 1: <description>
```

---

### 10. Proceed to the Next Phase

Report the next pending phase to the user and stop. Do not start the next phase in the same prompt-response cycle — wait for a new prompt.

---

## Per Phase Deliverable

Produce a fully implemented and tested phase, explained to and approved by the user, then committed and marked as done in `docs/specs/<slug>-phases.md`.
