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
      "Run model-authored JavaScript coordinating isolated Pi agents.",
      "The async body receives run(agent, packet, cwd?), parallel(thunks), cwd, and agents.",
      "Explorer finds repo evidence; librarian finds current primary sources; worker implements settled, isolated scope.",
      "Use run() once for one side task, parallel() only for independent tasks, and normal JavaScript for adaptive stages/retries.",
      `Limit: ${MAX_AGENT_CALLS} calls, ${MAX_CONCURRENCY} concurrent. Return a compact synthesis; the parent owns decisions, integration, and final proof.`,
    ].join(" "),
    promptSnippet:
      "Write adaptive JavaScript workflows over explorer, librarian, and worker agents",
    parameters: Type.Object({
      code: Type.String({
        description:
          "Async function body; call run() and return a value. Example: return run('explorer', {outcome:'Map auth', proof:'paths/lines'})",
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
