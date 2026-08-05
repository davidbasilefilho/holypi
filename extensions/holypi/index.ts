import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import { discoverAgents } from "./agents.js";
import { runAgent, type RunResult } from "./runner.js";

const agentNames = ["explorer", "librarian", "worker"] as const;
const MAX_WORKFLOW_BYTES = 32_000;
const holyInstructions = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../SYSTEM.md"),
  "utf8",
);

function text(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export default function holypi(pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => ({
    systemPrompt: `${event.systemPrompt}\n\n${holyInstructions}`,
  }));

  pi.registerTool({
    name: "holy_subagent",
    label: "Holy Subagent",
    description: "Run one isolated explorer, librarian, or worker Pi process. The parent retains architecture and final verification.",
    promptSnippet: "Delegate a bounded packet to an isolated explorer, librarian, or worker",
    parameters: Type.Object({
      agent: StringEnum(agentNames),
      task: Type.String({ description: "Outcome/question, scope, fixed decisions, proof, and stop conditions" }),
      cwd: Type.Optional(Type.String()),
    }),
    async execute(_id, params, signal, onUpdate, ctx) {
      const agent = discoverAgents(ctx.cwd, ctx.isProjectTrusted()).find((entry) => entry.name === params.agent);
      if (!agent) throw new Error(`Agent not found: ${params.agent}`);
      onUpdate?.({ content: [{ type: "text", text: `${agent.name} running…` }], details: {} });
      const result = await runAgent(agent, params.task, params.cwd ?? ctx.cwd, signal);
      if (result.exitCode !== 0) throw new Error(result.stderr || `${agent.name} exited ${result.exitCode}`);
      return { content: [{ type: "text", text: result.output || "(no output)" }], details: result };
    },
  });

  pi.registerTool({
    name: "holy_workflow",
    label: "Holy Workflow",
    description: "Execute model-authored JavaScript orchestration. Code is an async function body with run(agent, task, cwd?), parallel(thunks), cwd, and agents. It must return a result. Max 8 subagent calls and 4 concurrent calls.",
    promptSnippet: "Write JavaScript workflows that spin up and coordinate specialized subagents",
    promptGuidelines: [
      "Use holy_workflow for broad tasks with multiple independent evidence or implementation packets; workflow code must call run() or parallel() and return a synthesized handoff.",
    ],
    parameters: Type.Object({
      code: Type.String({ description: "Async JavaScript function body, e.g. return parallel([() => run('explorer', '...')])" }),
    }),
    async execute(_id, params, signal, onUpdate, ctx) {
      if (Buffer.byteLength(params.code, "utf8") > MAX_WORKFLOW_BYTES) throw new Error("Workflow code exceeds 32 KB");
      const definitions = discoverAgents(ctx.cwd, ctx.isProjectTrusted());
      let calls = 0;
      let active = 0;
      const waiters: Array<() => void> = [];
      const acquire = async () => {
        if (active >= 4) await new Promise<void>((resolve) => waiters.push(resolve));
        active++;
      };
      const release = () => { active--; waiters.shift()?.(); };
      const run = async (name: string, task: string, childCwd = ctx.cwd): Promise<RunResult> => {
        if (++calls > 8) throw new Error("Workflow exceeds 8 subagent calls");
        const agent = definitions.find((entry) => entry.name === name);
        if (!agent) throw new Error(`Unknown agent ${name}; available: ${definitions.map((entry) => entry.name).join(", ")}`);
        await acquire();
        onUpdate?.({ content: [{ type: "text", text: `${name} running (${calls}/8)…` }], details: { calls, active } });
        try {
          const result = await runAgent(agent, task, childCwd, signal);
          if (result.exitCode !== 0) throw new Error(result.stderr || `${name} exited ${result.exitCode}`);
          return result;
        } finally { release(); }
      };
      const parallel = <T>(thunks: Array<() => Promise<T>>) => Promise.all(thunks.map((thunk) => thunk()));
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...values: unknown[]) => Promise<unknown>;
      const workflow = new AsyncFunction("run", "parallel", "cwd", "agents", `"use strict";\n${params.code}`);
      const result = await workflow(run, parallel, ctx.cwd, agentNames);
      return { content: [{ type: "text", text: text(result) }], details: { calls, result } };
    },
  });

  pi.registerTool({
    name: "holy_ask",
    label: "Ask User",
    description: "Ask one material question, present consequence-bearing choices, or hand control to the user. Never use for rhetorical confirmation.",
    parameters: Type.Object({
      title: Type.String(),
      question: Type.String(),
      choices: Type.Optional(Type.Array(Type.Object({ label: Type.String(), description: Type.Optional(Type.String()) }))),
      handoff: Type.Optional(Type.Boolean({ default: false })),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      if (!ctx.hasUI) throw new Error("holy_ask requires TUI or RPC mode");
      let answer: string | undefined;
      if (params.choices?.length) {
        const rendered = params.choices.map((choice) => choice.description ? `${choice.label} — ${choice.description}` : choice.label);
        const selected = await ctx.ui.select(`${params.title}\n${params.question}`, rendered);
        answer = selected === undefined ? undefined : params.choices[rendered.indexOf(selected)]?.label;
      } else {
        answer = await ctx.ui.input(`${params.title}: ${params.question}`);
      }
      if (answer === undefined) return { content: [{ type: "text", text: "User canceled the question." }], details: { canceled: true } };
      return { content: [{ type: "text", text: params.handoff ? `User completed handoff: ${answer}` : `User answered: ${answer}` }], details: { answer, handoff: params.handoff ?? false } };
    },
  });
}
