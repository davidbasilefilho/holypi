---
name: security-research
description: Runs an exploitability-driven security audit with parallel attack-surface, auth/data, runtime/supply-chain, and independent PoC passes. Use for security review, vulnerability research, exploitability audits, threat-model validation, or pre-release checks; do not use for routine correctness review.
---

# Security research

Adapted without methodology loss from oh-my-openagent's `security-research` skill. Run only in the parent with `holy_workflow` and a concrete repository, diff, PR, release candidate, path list, or threat surface. If no target is given, use the current branch diff against its merge base; if there is no diff, inspect security-sensitive working-tree surfaces.

## Standard

Classify root causes with [CWE](https://cwe.mitre.org/), test with [OWASP WSTG](https://devguide.owasp.org/en/06-verification/01-guides/01-wstg/), verify controls with [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), and score only when justified with [CVSS v4.0](https://www.first.org/cvss/v4.0/specification-document).

- No severity without an attack path; no high or critical without concrete preconditions and impact.
- Keep CWE category separate from severity. Prefer a small reproducible PoC to theoretical language.
- Never exploit real or third-party systems destructively. Use local fixtures, toy payloads, dry runs, or static proof when execution is unsafe.

## Workflow

1. **Scope and baseline.** Establish target, reason, branch/base/diff, changed files, sensitive paths, tests, commands, and constraints such as no network or destructive execution. Inspect with repository tools before fan-out.
2. **Three independent hunters.** In one `holy_workflow`, run parallel explorers with these nonoverlapping roles:
   - **surface:** entry points, trust boundaries, attacker-controlled inputs, sinks, privilege transitions, reachable surfaces, and sensitive assets;
   - **auth/data:** authentication, authorization, tenant/data isolation, injection, SSRF, credential exposure, secrets, and confused-deputy paths;
   - **runtime/supply:** filesystem, subprocess, archives, dependencies, hooks, MCP/tool execution, config, environment, path traversal, command injection, unsafe downloads, permissions, and supply-chain assumptions.
3. Require each candidate to include title, file/function, attacker capability, preconditions, attack path, impact, CWE candidate, exact evidence, and safe verification idea. Reject generic hardening advice and candidates without a plausible path.
4. Deduplicate candidates. Run **two independent PoC passes** in parallel, using explorers for read-only/static proof or workers only for explicitly authorized local fixtures/tests. Each must classify every candidate as reproduced, falsified, or unsafe to run; provide commands/fixtures/static proof, observed output or failure reason, severity recommendation, and downgrade rationale.
5. **Cross-check.** Give hunter and PoC evidence to independent follow-up passes. Ask what survives, what must be downgraded or removed, the smallest specific remediation, and the regression check. Do not let a specialist judge its own claim alone.
6. Parent synthesizes and verifies. Do not modify production code unless the user also authorized fixes; if fixes are requested, settle scope and ownership before worker calls.

## Report

Lead with `PASS`, `PASS WITH FINDINGS`, or `BLOCK`; never bury blockers. State target, base/diff, and commands. For each surviving finding report severity, title, CWE, exploitability, impact, PoC, exact evidence and attack path, severity rationale, minimal fix, and regression check. List downgraded/rejected candidates with reasons and residual untested risk. Never present speculation as a vulnerability or claim CVSS precision without scoring its metrics.

Source methodology: `code-yeongyu/oh-my-openagent`, `.agents/skills/security-research/SKILL.md` (dev branch, retrieved 2026-08-05).
