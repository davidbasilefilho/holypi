import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { discoverAgents } from "../extensions/holypi/agents.js";
import { renderPacket } from "../extensions/holypi/index.js";

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
      await writeFile(
        join(cwd, ".pi", "agents", "explorer.md"),
        `---\nname: explorer\ndescription: local\ntools: read\n---\nLocal prompt\n`,
      );
      const explorer = discoverAgents(cwd, true).find((agent) => agent.name === "explorer");
      expect(explorer?.description).toBe("local");
      expect(explorer?.prompt).toBe("Local prompt");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe("workflow packets", () => {
  test("renders every structured delegation field", () => {
    expect(
      renderPacket({
        outcome: "Map auth",
        scope: "src/auth",
        fixed: ["read only", "no architecture decisions"],
        proof: "paths and lines",
        stop: "before edits",
        context: "change request",
      }),
    ).toBe(
      [
        "Outcome: Map auth",
        "Scope: src/auth",
        "Fixed decisions: read only; no architecture decisions",
        "Expected proof: paths and lines",
        "Stop conditions: before edits",
        "Context: change request",
      ].join("\n"),
    );
  });
});
