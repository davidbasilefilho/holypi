import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { discoverAgents } from "./agents.js";
import { runAgent, type RunResult } from "./runner.js";

const MAX_WORKFLOW_BYTES = 32_000;
const MAX_AGENT_CALLS = 48;
const MAX_CONCURRENCY = 4;
const holyInstructions = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../SYSTEM.md"),
  "utf8",
);

export interface WorkflowPacket {
  outcome: string;
  scope?: string;
  fixed?: string | string[];
  proof?: string;
  stop?: string;
  context?: string;
}

export function renderPacket(packet: string | WorkflowPacket): string {
  if (typeof packet === "string") return packet;
  const fields: Array<[string, string | string[] | undefined]> = [
    ["Outcome", packet.outcome],
    ["Scope", packet.scope],
    ["Fixed decisions", packet.fixed],
    ["Expected proof", packet.proof],
    ["Stop conditions", packet.stop],
    ["Context", packet.context],
  ];
  return fields
    .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
    .map(([label, value]) => `${label}: ${Array.isArray(value) ? value.join("; ") : value}`)
    .join("\n");
}

function formatResult(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export default function holypi(pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => ({
    systemPrompt: `${event.systemPrompt}\n\n${holyInstructions}`,
  }));

  pi.registerTool({
    name: "holy_workflow",
    label: "Holy Workflow",
    description: [
      "Execute model-authored JavaScript that plans and coordinates isolated Pi subagents.",
      "Use one run() for bounded context isolation; parallel() for independent packets; ordinary JavaScript loops and conditionals for adaptive fan-out, retries, staged migrations, review, and verification.",
      "Available agents are explorer (read-only repository evidence), librarian (current primary-source research), and worker (fixed-scope implementation only after decisions and ownership are settled).",
      `Code is an async function body with run(agent, packet, cwd?), parallel(thunks), cwd, and agents. Maximum ${MAX_AGENT_CALLS} calls and ${MAX_CONCURRENCY} concurrent agents.`,
      "Return a compact synthesis or structured handoff; the parent still owns architecture, integration, user decisions, and final verification.",
    ].join(" "),
    promptSnippet:
      "Write adaptive JavaScript workflows that spawn and coordinate explorer, librarian, and worker subagents",
    promptGuidelines: [
      "Use holy_workflow when isolated context, independent research, adaptive fan-out, staged implementation, or adversarial verification materially helps; for a single bounded delegation, write `return run(agent, packet)`.",
      "holy_workflow packets should state outcome, scope, fixed decisions, expected proof, and stop conditions; parallelize only independent work and never give workers overlapping write ownership.",
      "Treat holy_workflow outputs as evidence rather than authority; inspect failures, resolve conflicts, integrate changes, and run final verification in the parent.",
    ],
    parameters: Type.Object({
      code: Type.String({
        description:
          "Async JavaScript function body. It must call run() and return a value. Example: return parallel([() => run('explorer', {outcome:'Map auth', proof:'paths and lines'}), () => run('librarian', {outcome:'Find current official auth docs', proof:'claim-linked URLs'})])",
      }),
    }),
    async execute(_id, params, signal, onUpdate, ctx) {
      if (Buffer.byteLength(params.code, "utf8") > MAX_WORKFLOW_BYTES)
        throw new Error("Workflow code exceeds 32 KB");
      const definitions = discoverAgents(ctx.cwd, ctx.isProjectTrusted());
      const results: RunResult[] = [];
      let calls = 0;
      let active = 0;
      const waiters: Array<() => void> = [];

      const acquire = async () => {
        if (active >= MAX_CONCURRENCY) await new Promise<void>((done) => waiters.push(done));
        active++;
      };
      const release = () => {
        active--;
        waiters.shift()?.();
      };
      const run = async (
        name: string,
        packet: string | WorkflowPacket,
        childCwd = ctx.cwd,
      ): Promise<RunResult> => {
        if (++calls > MAX_AGENT_CALLS)
          throw new Error(`Workflow exceeds ${MAX_AGENT_CALLS} subagent calls`);
        const agent = definitions.find((entry) => entry.name === name);
        if (!agent)
          throw new Error(
            `Unknown agent ${name}; available: ${definitions.map((entry) => entry.name).join(", ")}`,
          );
        if (typeof packet !== "string" && (!packet || typeof packet.outcome !== "string")) {
          throw new Error("run() packet must be a string or an object with an outcome string");
        }
        await acquire();
        onUpdate?.({
          content: [{ type: "text", text: `${name} running - ${calls} started, ${active} active` }],
          details: { calls, active, completed: results.length },
        });
        try {
          const result = await runAgent(agent, renderPacket(packet), childCwd, signal);
          results.push(result);
          return result;
        } finally {
          release();
        }
      };
      const parallel = <T>(thunks: Array<() => Promise<T>>): Promise<T[]> =>
        Promise.all(thunks.map((thunk) => thunk()));
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
        ...args: string[]
      ) => (...values: unknown[]) => Promise<unknown>;
      const workflow = new AsyncFunction(
        "run",
        "parallel",
        "cwd",
        "agents",
        `"use strict";\n${params.code}`,
      );
      const agentCatalog = definitions.map(({ name, description }) => ({ name, description }));
      const result = await workflow(run, parallel, ctx.cwd, agentCatalog);
      if (calls === 0) throw new Error("Workflow code must call run() at least once");
      return {
        content: [{ type: "text", text: formatResult(result) }],
        details: { calls, succeeded: results.filter((entry) => entry.ok).length, results, result },
        usage: results.reduce(
          (usage, entry) => ({
            input: usage.input + entry.usage.input,
            output: usage.output + entry.usage.output,
            cacheRead: usage.cacheRead + entry.usage.cacheRead,
            cacheWrite: usage.cacheWrite + entry.usage.cacheWrite,
            totalTokens: usage.totalTokens + entry.usage.totalTokens,
            cost: {
              input: usage.cost.input + entry.usage.cost.input,
              output: usage.cost.output + entry.usage.cost.output,
              cacheRead: usage.cost.cacheRead + entry.usage.cost.cacheRead,
              cacheWrite: usage.cost.cacheWrite + entry.usage.cost.cacheWrite,
              total: usage.cost.total + entry.usage.cost.total,
            },
          }),
          {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
        ),
      };
    },
  });
}
