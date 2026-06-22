import type { TaskRequest, TaskResult } from "../shared/protocol.js";
import { commandAllowed } from "./plugins.js";

export async function runBridgeTask(task: TaskRequest, entropy: number): Promise<TaskResult> {
  if (!commandAllowed(task.command, task.vmTarget, task.ideTarget)) {
    return {
      id: task.id,
      contextId: task.contextId,
      status: "failed",
      entropy,
      message: `Command is not allowlisted for ${task.vmTarget}/${task.ideTarget}: ${task.command}`,
      output: {
        vmTarget: task.vmTarget,
        ideTarget: task.ideTarget,
      },
      completedAt: new Date().toISOString(),
    };
  }

  return {
    id: task.id,
    contextId: task.contextId,
    status: "succeeded",
    entropy,
    message: `${task.command} accepted by ${task.vmTarget}/${task.ideTarget} bridge`,
    output: {
      vmTarget: task.vmTarget,
      ideTarget: task.ideTarget,
      runtimeAuthority: task.vmTarget === "apl-wasm" ? "APL/Rust/WASM substrate" : "plugin adapter",
      simulated: true,
      payloadKeys: Object.keys(task.payload),
    },
    completedAt: new Date().toISOString(),
  };
}
