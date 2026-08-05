---
name: babysit-ci
description: Monitors CI to completion, diagnoses failures, and applies bounded fixes when authorized.
---
# Babysit CI

Identify the exact run and commit. Poll with reasonable backoff until terminal state. On failure, inspect the first causal error rather than downstream noise, reproduce locally when practical, make only authorized fixes, and rerun. Report links, status, and unresolved infrastructure failures.
