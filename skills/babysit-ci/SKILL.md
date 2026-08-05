---
name: babysit-ci
description: Monitors CI to completion, diagnoses causal failures, and applies bounded fixes when authorized. Use when the user asks to watch or repair a specific CI run.
---

# Babysit CI

Identify the exact run and commit. Poll with reasonable backoff until terminal state. On failure, inspect the first causal error rather than downstream noise, reproduce locally when practical, make only authorized fixes, and rerun. Report links, status, and unresolved infrastructure failures.
