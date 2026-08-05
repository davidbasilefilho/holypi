---
name: refactor
description: Improves code structure while preserving externally observable behavior. Use when behavior must remain invariant; use programming when behavior intentionally changes.
---

# Refactor

State the invariant behavior and structural goal. Establish baseline tests. Make reversible, reviewable steps; avoid unrelated cleanup and speculative abstractions. Verify behavior after each boundary change and compare public API, errors, and side effects.
