import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface AgentDefinition {
  name: string;
  description: string;
  tools: string[];
  prompt: string;
}

const packageAgents = resolve(dirname(fileURLToPath(import.meta.url)), "../../agents");

function parseAgent(file: string): AgentDefinition {
  const source = readFileSync(file, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid agent definition: ${file}`);
  const fields = Object.fromEntries(
    match[1].split(/\r?\n/).flatMap((line) => {
      const colon = line.indexOf(":");
      return colon < 0 ? [] : [[line.slice(0, colon).trim(), line.slice(colon + 1).trim()]];
    }),
  );
  return {
    name: fields.name,
    description: fields.description,
    tools: (fields.tools ?? "").split(",").map((tool) => tool.trim()).filter(Boolean),
    prompt: match[2].trim(),
  };
}

export function discoverAgents(cwd: string, includeProject = false): AgentDefinition[] {
  const byName = new Map<string, AgentDefinition>();
  const directories = [packageAgents];
  if (includeProject) directories.push(join(cwd, ".pi", "agents"));
  for (const dir of directories) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".md")).sort()) {
      const agent = parseAgent(join(dir, name));
      byName.set(agent.name, agent);
    }
  }
  return [...byName.values()];
}
