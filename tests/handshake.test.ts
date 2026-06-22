import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const root = process.cwd();

function runNode(args: string[]): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        reject(new Error(stderr || `node exited with ${code}`));
      }
    });
  });
}

test("kittybrowse handshake validates against shadow lineage contract", async () => {
  await runNode(["scripts/validate-handshake.mjs"]);

  const handshake = JSON.parse(
    await readFile(join(root, "lineage", "kittybrowse-shadow-handshake.json"), "utf8"),
  );

  assert.equal(handshake.protocol, "shadow-grisp/json-handshake-v1");
  assert.equal(handshake.from.stone, 4);
  assert.equal(handshake.to.repo, "shadow-orchestrator");
  assert.equal(handshake.integration.primary_vm_target, "apl-wasm");
});
