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
}

function piCommand(): string {
  const name = process.platform === "win32" ? "pi.cmd" : "pi";
  return process.env.HOLYPI_PI_COMMAND || name;
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
  const args = ["--mode", "json", "-p", "--no-session", "--append-system-prompt", prompt];
  if (agent.tools.length) args.push("--tools", agent.tools.join(","));
  args.push(`Task: ${task}`);

  try {
    return await new Promise<RunResult>((resolve, reject) => {
      const child = spawn(piCommand(), args, { cwd, shell: process.platform === "win32", windowsHide: true });
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
              for (const part of event.message.content ?? []) if (part.type === "text") output = part.text;
            }
          } catch { /* ignore non-JSON child output */ }
        }
      });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (code) => resolve({ agent: agent.name, output, exitCode: code ?? 1, stderr }));
      const abort = () => child.kill();
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
