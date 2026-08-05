# holypi

HolyCodex's compact operating model, skills, and specialized agents ported to
[Pi](https://github.com/earendil-works/pi-mono).

## Install

```bash
pi install git:github.com/davidbasilefilho/holypi
```

The package contributes:

- `holy_workflow`: model-authored JavaScript that calls `run()` and
  `parallel()` to adaptively coordinate isolated subagents
- [`@howaboua/pi-ask`](https://github.com/IgorWarzocha/howaboua-pi-stuff/tree/main/packages/pi-ask), bundled and enabled for decisions, review triage, and handoffs
- [`@howaboua/pi-auto-reasoning-tool`](https://github.com/IgorWarzocha/howaboua-pi-stuff/tree/main/packages/pi-auto-reasoning-tool), bundled and enabled for phase-level reasoning changes
- workflow presets: `/holy-explore`, `/holy-research`, `/holy-implement`
- the HolyCodex skill set, converted to Pi's Agent Skills layout
- `frontend-taste`, a dense implementation and visual-QA port of the complete
  pols.dev anti-slop design law
- `security-research`, an exploitability-first five-lane audit adapted to
  HolyPi workflows from oh-my-openagent
- `agents/explorer.md`, `agents/librarian.md`, and `agents/worker.md`

### Dynamic workflow example

The model calls `holy_workflow` with JavaScript such as:

```js
const [repo, docs] = await parallel([
  () =>
    run("explorer", {
      outcome: "Map the relevant repository code",
      proof: "Paths, line references, callers, and tests",
      stop: "Stop before edits or architecture decisions",
    }),
  () =>
    run("librarian", {
      outcome: "Find current primary-source documentation",
      proof: "Claim-linked official URLs with versions and dates",
    }),
]);
if (!repo.ok || !docs.ok) return { repo, docs };
return run("worker", {
  outcome: "Implement the already-decided change",
  fixed: ["No public API changes", "Modify only the assigned files"],
  proof: "Focused tests and typecheck",
  context: `${repo.output}\n${docs.output}`,
});
```

Workflow code runs locally with your permissions. Inspect this package before
installing it. Project-local `.pi/agents/*.md` overrides are loaded only when Pi
marks the project trusted.

## Design

Explorer is bounded repository discovery, librarian is primary-source external
research, and worker is fixed-scope implementation. A single `run()` handles a
bounded side task; JavaScript loops, conditions, staged calls, and `parallel()`
allow the model to build a task-specific execution graph at runtime. Failed
results remain inspectable so a workflow can retry, change strategy, or return
a blocker. The parent remains the owner of architecture, integration, and final
verification.

This is a deliberately bounded Pi analogue of Claude Code's dynamic workflows:
model-authored orchestration, isolated specialized agents, adaptive fan-out,
parallel and sequential stages, result handoffs, and explicit verification.
HolyPi caps a workflow at 64 calls and 8 concurrent children, rather than aiming
at Claude's research-preview scale. Children start with `--no-extensions` so
their native tool restrictions are stable and they cannot recursively load the
workflow engine.

Inspired by [HolyCodex](https://github.com/davidbasilefilho/holycodex), Pi's
official subagent example, and
[howaboua-pi-stuff](https://github.com/IgorWarzocha/howaboua-pi-stuff).

## Development

```bash
bun install
vp check
vp test
```

Vite+ owns formatting, linting, type checking, and tests. `mise.toml` and the
package engine pin development to Node 26; package versions follow ZeroVer.

License: SUL-1.0. See `LICENSE`.
