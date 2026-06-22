export type VmTarget = "apl-wasm" | "rust" | "python" | "wasm" | "docker";
export type IdeTarget = "vscode" | "neovim" | "jetbrains" | "none";
export type TaskStatus = "queued" | "blocked" | "running" | "succeeded" | "failed";

export type EntropyInput = {
  dependencies: string[];
  failRate: number;
  latencyMs: number;
};

export type KittyAgentContext = {
  id: string;
  label: string;
  url: string;
  memory: Record<string, unknown>;
  vmTarget: VmTarget;
  ideTarget: IdeTarget;
  entropy: number;
  createdAt: string;
};

export type TaskRequest = EntropyInput & {
  id: string;
  contextId: string;
  command: string;
  payload: Record<string, unknown>;
  vmTarget: VmTarget;
  ideTarget: IdeTarget;
};

export type TaskEnvelope = {
  subject: string;
  issuedAt: string;
  task: TaskRequest;
  signature?: string;
};

export type TaskResult = {
  id: string;
  contextId: string;
  status: TaskStatus;
  entropy: number;
  message: string;
  output: Record<string, unknown>;
  completedAt?: string;
};

export type RuntimeSnapshot = {
  mesh: "nats" | "local";
  contexts: KittyAgentContext[];
  results: TaskResult[];
};

export const TOPICS = {
  TASK_RUN: "kitty.task.run",
  TASK_RESULT: "kitty.task.result",
  AGENT_STATE: "kitty.agent.state",
} as const;
