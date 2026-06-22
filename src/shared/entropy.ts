import type { EntropyInput } from "./protocol.js";

export type EntropyWeights = {
  dependencies: number;
  failRate: number;
  latency: number;
};

export const DEFAULT_WEIGHTS: EntropyWeights = {
  dependencies: 0.3,
  failRate: 0.5,
  latency: 0.2,
};

export const DEFAULT_THRESHOLD = 0.21;

function clamp01(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

export function entropyScore(task: EntropyInput, weights = DEFAULT_WEIGHTS): number {
  const dependencyPressure = clamp01(task.dependencies.length / 10);
  const failPressure = clamp01(task.failRate);
  const latencyPressure = clamp01(task.latencyMs / 10_000);

  return Number(
    (
      dependencyPressure * weights.dependencies +
      failPressure * weights.failRate +
      latencyPressure * weights.latency
    ).toFixed(4),
  );
}

export function isExecutable(task: EntropyInput, threshold = DEFAULT_THRESHOLD): boolean {
  return entropyScore(task) < threshold;
}

