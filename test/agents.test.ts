import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAgents } from "../extensions/holypi/agents.js";

describe("agent discovery", () => {
  test("loads bundled presets", () => {
    expect(discoverAgents(process.cwd()).map((agent) => agent.name)).toEqual(
      expect.arrayContaining(["explorer", "librarian", "worker"]),
    );
  });

  test("trusted project definitions override bundled definitions", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "holypi-test-"));
    try {
      await mkdir(join(cwd, ".pi", "agents"), { recursive: true });
      await writeFile(join(cwd, ".pi", "agents", "explorer.md"), `---\nname: explorer\ndescription: local\ntools: read\n---\nLocal prompt\n`);
      const explorer = discoverAgents(cwd, true).find((agent) => agent.name === "explorer");
      expect(explorer?.description).toBe("local");
      expect(explorer?.prompt).toBe("Local prompt");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
