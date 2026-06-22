import assert from "node:assert/strict";
import test from "node:test";
import { entropyScore, isExecutable } from "../src/shared/entropy.js";

test("entropyScore combines workload, failure pressure, and latency", () => {
  const score = entropyScore({
    dependencies: ["a", "b"],
    failRate: 0.1,
    latencyMs: 500,
  });

  assert.equal(score, 0.12);
});

test("isExecutable blocks high uncertainty tasks", () => {
  assert.equal(
    isExecutable({
      dependencies: ["a", "b", "c", "d", "e", "f"],
      failRate: 0.5,
      latencyMs: 5_000,
    }),
    false,
  );
});

