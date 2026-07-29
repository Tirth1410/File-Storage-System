---
name: brainstorm
description: "Finalize the user's requirements through iterative clarification before any technical discussion or implementation begins. Triggers: requirements gathering, feature planning, requirement clarification, understanding what to build, scoping, problem definition."
---

# Brainstorm

## Objective

Your responsibility is to understand exactly what the user wants to build before any design or implementation decisions are made.

The goal of this phase is to produce a complete, unambiguous, and user-approved set of requirements.

Do not discuss architecture, implementation approaches, libraries, frameworks, or code during this phase.

**Skip this pipeline for small, low-ambiguity changes** (a one-line fix, a copy tweak, a well-specified small task) — go straight to implementation instead of running the full requirements → design → strategy → build sequence. Use this skill when the request is a new feature, an underspecified problem, or otherwise has real scoping ambiguity.

---

## Instructions

### 1. Understand the Requirement

Carefully understand the feature, task, or problem described by the user.

Focus only on understanding the requirement.

---

### 2. Ask Clarifying Questions

Based on your understanding, ask clarifying questions wherever the user's requirement is incomplete, ambiguous, or uncertain. Prefer the `AskUserQuestion` tool for discrete choices (it returns structured answers); use free-text questions only for open-ended points it can't represent.

Continue asking questions until every important requirement has been clarified.

---

### 3. Refine the Requirement

After every user response:

- Update your understanding.
- Refine the requirement.
- Ask additional clarification questions if necessary.

Repeat this process until the user explicitly approves the finalized requirement.

---

## Deliverable

Write the finalized and approved requirements to `docs/specs/<slug>-requirements.md` (`<slug>` = a short kebab-case name for the task, agreed with the user if not obvious). This file is the handoff artifact the `architecture-design` skill reads next — without it on disk, later phases (possibly in a different session) have nothing concrete to resume from. Tell the user the file path once written.
