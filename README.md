# holypi

HolyCodex's compact operating model, skills, and specialized agents ported to
[Pi](https://github.com/earendil-works/pi-mono).

## Install

```bash
pi install git:github.com/davidbasilefilho/holypi
```

The package contributes:

- `holy_subagent`: one isolated explorer, librarian, or worker Pi process
- `holy_workflow`: a JavaScript workflow written by the agent that calls
  `run()` and `parallel()` to spin up subagents
- `holy_ask`: interactive decisions, free-text questions, and user handoffs
- workflow presets: `/holy-explore`, `/holy-research`, `/holy-implement`
- the HolyCodex skill set, converted to Pi's Agent Skills layout
- `agents/explorer.md`, `agents/librarian.md`, and `agents/worker.md`

### Dynamic workflow example

The model calls `holy_workflow` with JavaScript such as:

```js
const [repo, docs] = await parallel([
  () => run("explorer", "Map the relevant repository code"),
  () => run("librarian", "Find current primary-source documentation"),
]);
return run("worker", `Implement the fixed change. Evidence:\n${repo.output}\n${docs.output}`);
```

Workflow code runs locally with your permissions. Inspect this package before
installing it. Project-local `.pi/agents/*.md` overrides are loaded only when Pi
marks the project trusted.

## Design

Explorer is bounded repository discovery, librarian is primary-source external
research, and worker is fixed-scope implementation. The parent remains the
owner of architecture, integration, and final verification. This follows the
context-isolation pattern of Claude Code subagents while using ordinary Pi
subprocesses and model-authored JavaScript orchestration.

Inspired by [HolyCodex](https://github.com/davidbasilefilho/holycodex), Pi's
official subagent example, and
[howaboua-pi-stuff](https://github.com/IgorWarzocha/howaboua-pi-stuff).

## Development

```bash
bun install
bun run check
```

License: SUL-1.0. See `LICENSE`.
