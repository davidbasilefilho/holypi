import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentDefinition } from "./agents.js";

export interface RunResult {
  agent: string;
  output: string;
  exitCode: number;
  stderr: string;
  ok: boolean;
  stopReason?: string;
  errorMessage?: string;
  durationMs: number;
  turns: number;
  usage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
  };
}

function piCommand(): string {
  const name = process.platform === "win32" ? "pi.exe" : "pi";
  return process.env.HOLYPI_PI_COMMAND || name;
}

export function buildAgentArgs(agent: AgentDefinition, prompt: string, task: string): string[] {
  const args = [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "--no-prompt-templates",
    "--append-system-prompt",
    prompt,
  ];
  if (agent.tools.length) args.push("--tools", agent.tools.join(","));
  args.push(`Task: ${task}`);
  return args;
}

export async function runAgent(
  agent: AgentDefinition,
  task: string,
  cwd: string,
  signal?: AbortSignal,
): Promise<RunResult> {
  const temp = await mkdtemp(join(tmpdir(), "holypi-agent-"));
  const prompt = join(temp, `${agent.name}.md`);
  await writeFile(prompt, agent.prompt, { encoding: "utf8", mode: 0o600 });
  const args = buildAgentArgs(agent, prompt, task);

  try {
    return await new Promise<RunResult>((resolve, reject) => {
      const started = Date.now();
      const usage = {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      };
      let turns = 0;
      let stopReason: string | undefined;
      let errorMessage: string | undefined;
      const child = spawn(piCommand(), args, {
        cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      let output = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        const lines = stdout.split(/\r?\n/);
        stdout = lines.pop() ?? "";
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === "message_end" && event.message?.role === "assistant") {
              turns++;
              for (const part of event.message.content ?? [])
                if (part.type === "text") output = part.text;
              stopReason = event.message.stopReason ?? stopReason;
              errorMessage = event.message.errorMessage ?? errorMessage;
              const childUsage = event.message.usage;
              if (childUsage) {
                usage.input += childUsage.input ?? 0;
                usage.output += childUsage.output ?? 0;
                usage.cacheRead += childUsage.cacheRead ?? 0;
                usage.cacheWrite += childUsage.cacheWrite ?? 0;
                usage.totalTokens += childUsage.totalTokens ?? 0;
                usage.cost.input += childUsage.cost?.input ?? 0;
                usage.cost.output += childUsage.cost?.output ?? 0;
                usage.cost.cacheRead += childUsage.cost?.cacheRead ?? 0;
                usage.cost.cacheWrite += childUsage.cost?.cacheWrite ?? 0;
                usage.cost.total += childUsage.cost?.total ?? 0;
              }
            }
          } catch {
            /* ignore non-JSON child output */
          }
        }
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        const exitCode = code ?? 1;
        const ok = exitCode === 0 && stopReason !== "error" && stopReason !== "aborted";
        resolve({
          agent: agent.name,
          output,
          exitCode,
          stderr,
          ok,
          stopReason,
          errorMessage,
          durationMs: Date.now() - started,
          turns,
          usage,
        });
      });
      const abort = () => child.kill();
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
