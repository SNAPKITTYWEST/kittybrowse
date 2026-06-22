import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { entropyScore, isExecutable } from "../shared/entropy.js";
import {
  TOPICS,
  type KittyAgentContext,
  type RuntimeSnapshot,
  type TaskEnvelope,
  type TaskRequest,
  type TaskResult,
} from "../shared/protocol.js";
import { runBridgeTask } from "./adapters.js";
import { createMeshBus, type MeshBus } from "./mesh.js";

export class KittyRuntime {
  private readonly contexts = new Map<string, KittyAgentContext>();
  private readonly results = new Map<string, TaskResult>();
  private unsubscribeTask?: () => Promise<void>;

  constructor(private readonly mesh: MeshBus) {}

  static async create(url?: string): Promise<KittyRuntime> {
    const mesh = await createMeshBus(url);
    const runtime = new KittyRuntime(mesh);
    await runtime.start();
    return runtime;
  }

  get meshKind(): "nats" | "local" {
    return this.mesh.kind;
  }

  async start(): Promise<void> {
    this.unsubscribeTask = await this.mesh.subscribe(TOPICS.TASK_RUN, async (raw) => {
      const envelope = JSON.parse(raw) as TaskEnvelope;
      const entropy = entropyScore(envelope.task);
      const result = await runBridgeTask(envelope.task, entropy);
      this.results.set(result.id, result);
      await this.mesh.publish(TOPICS.TASK_RESULT, JSON.stringify(result));
    });
  }

  createContext(input: Partial<KittyAgentContext> = {}): KittyAgentContext {
    const id = input.id ?? `agent-${randomUUID()}`;
    const context: KittyAgentContext = {
      id,
      label: input.label ?? "Agent Context",
      url: input.url ?? "about:blank",
      memory: input.memory ?? {},
      vmTarget: input.vmTarget ?? "apl-wasm",
      ideTarget: input.ideTarget ?? "none",
      entropy: input.entropy ?? 0,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    this.contexts.set(id, context);
    return context;
  }

  async submitTask(input: Omit<TaskRequest, "id" | "contextId"> & { id?: string; contextId?: string }): Promise<TaskResult> {
    const contextId = input.contextId ?? this.createContext().id;
    const task: TaskRequest = {
      ...input,
      id: input.id ?? `task-${randomUUID()}`,
      contextId,
    };

    const entropy = entropyScore(task);
    const context = this.contexts.get(contextId);
    if (context) {
      context.entropy = entropy;
    }

    if (!isExecutable(task)) {
      const blocked: TaskResult = {
        id: task.id,
        contextId,
        status: "blocked",
        entropy,
        message: "Entropy threshold blocked execution",
        output: {
          threshold: 0.21,
          dependencies: task.dependencies.length,
          failRate: task.failRate,
          latencyMs: task.latencyMs,
        },
      };
      this.results.set(blocked.id, blocked);
      return blocked;
    }

    const queued: TaskResult = {
      id: task.id,
      contextId,
      status: "queued",
      entropy,
      message: `Published to ${TOPICS.TASK_RUN}`,
      output: { mesh: this.mesh.kind },
    };
    this.results.set(queued.id, queued);

    const envelope: TaskEnvelope = {
      subject: TOPICS.TASK_RUN,
      issuedAt: new Date().toISOString(),
      task,
    };
    await this.mesh.publish(TOPICS.TASK_RUN, JSON.stringify(envelope));
    return queued;
  }

  snapshot(): RuntimeSnapshot {
    return {
      mesh: this.mesh.kind,
      contexts: [...this.contexts.values()],
      results: [...this.results.values()].slice(-50).reverse(),
    };
  }

  async stop(): Promise<void> {
    if (this.unsubscribeTask) {
      await this.unsubscribeTask();
    }
    await this.mesh.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const runtime = await KittyRuntime.create();
  runtime.createContext({ label: "CLI Agent", url: "kitty://runtime", vmTarget: "apl-wasm" });
  console.log(JSON.stringify(runtime.snapshot(), null, 2));
}
