import assert from "node:assert/strict";
import test from "node:test";
import { KittyRuntime } from "../src/runtime/agent-runtime.js";
import { LocalMeshBus } from "../src/runtime/mesh.js";

test("runtime creates an agent context and queues executable tasks", async () => {
  const runtime = new KittyRuntime(new LocalMeshBus());
  await runtime.start();

  const context = runtime.createContext({ label: "Test Context" });
  const result = await runtime.submitTask({
    contextId: context.id,
    command: "execute_resonance_vm",
    payload: { ok: true },
    dependencies: [],
    failRate: 0,
    latencyMs: 100,
    vmTarget: "apl-wasm",
    ideTarget: "vscode",
  });

  assert.equal(result.status, "queued");
  assert.equal(runtime.snapshot().contexts.length, 1);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(runtime.snapshot().results[0]?.status, "succeeded");

  await runtime.stop();
});

test("runtime blocks tasks above entropy threshold before dispatch", async () => {
  const runtime = new KittyRuntime(new LocalMeshBus());
  await runtime.start();
  const context = runtime.createContext();

  const result = await runtime.submitTask({
    contextId: context.id,
    command: "execute_resonance_vm",
    payload: {},
    dependencies: ["a", "b", "c", "d", "e", "f", "g"],
    failRate: 0.8,
    latencyMs: 9_000,
    vmTarget: "docker",
    ideTarget: "none",
  });

  assert.equal(result.status, "blocked");
  assert.equal(runtime.snapshot().results[0]?.status, "blocked");

  await runtime.stop();
});
