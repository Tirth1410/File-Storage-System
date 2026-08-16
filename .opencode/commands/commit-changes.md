---
description: Stage all changes and generate a concise conventional commit message
---

Stage all the required files for the commit by running `git add -A` (this stages new, modified, and deleted files).

Then analyze the staged changes below and generate a commit message.

Staged changes:
!`git add -A && git diff --cached --stat && echo "===== FULL DIFF =====" && git diff --cached`

Based on the staged changes, create a commit message that:

- Starts with a single conventional commit prefix — `feat():`, `fix():`, `chore():`, `refactor():`, `docs():`, `style():`, `test():`, `perf():`, `build():`, `ci():`, or `revert():` — that best describes the overall change. Do NOT repeat the prefix at the start of every bullet point.
- Uses multiple bullet points, one per distinct logical change.
- Is very concise and self-explanatory, written in the imperative mood (e.g. "Add", "Fix", "Refactor", "Remove").
- Each bullet point clearly states what changed and why, without unnecessary detail.
- Avoids listing raw file paths unless they add meaningful clarity.

Present the final commit message in a code block so it can be copied and used directly with `git commit`.
