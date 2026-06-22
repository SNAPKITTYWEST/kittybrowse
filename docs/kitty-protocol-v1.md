# Kitty Protocol v1

Kitty Protocol v1 defines how KittyBrowse moves work between the Chromium UI, the local agent runtime, NATS, and VM/IDE plugins.

## Subjects

```text
kitty.task.run
kitty.task.result
kitty.agent.state
```

## Task envelope

```json
{
  "subject": "kitty.task.run",
  "issuedAt": "2026-06-22T00:00:00.000Z",
  "task": {
    "id": "task-id",
    "contextId": "agent-id",
    "command": "execute_resonance_vm",
    "payload": {},
    "dependencies": [],
    "failRate": 0,
    "latencyMs": 100,
    "vmTarget": "apl-wasm",
    "ideTarget": "vscode"
  },
  "signature": "optional-detached-signature"
}
```

## Execution rule

The runtime computes an entropy score before dispatch:

```text
dependencyPressure * 0.3 + failPressure * 0.5 + latencyPressure * 0.2
```

Tasks execute only when the score is below `0.21`.

## Plugin rule

Plugins are allowlisted by manifest. A command must be present in a plugin manifest before an adapter may execute or simulate it.

The primary execution target is `apl-wasm`; JavaScript/TypeScript is only UI, IPC, and message-envelope glue.
