# KittyBrowse

KittyBrowse is a Chromium-based agent browser scaffold: each tab is treated as an agent context, each page is an execution surface, and each URL is a task pointer. The browser is the shell; APL/Rust/WASM is the preferred execution substrate.

## Architecture

```text
Chromium UI (Electron)
  -> Agent Runtime Layer
  -> Entropy Scheduler
  -> NATS Event Mesh
  -> VM / IDE / Tool Bridge
  -> Unified Output Stream
```

## Current implementation

- Electron shell with secure preload IPC bridge.
- Local agent runtime running inside the main process.
- NATS mesh adapter with in-process fallback when `NATS_URL` is not reachable.
- Deterministic entropy scheduler based on dependencies, fail rate, and latency.
- VM/IDE plugin manifests with allowlisted targets and no raw shell execution.
- Minimal Rust VM bridge crate under `crates/rust-vm-bridge`.
- Node test suite for scheduler and runtime dispatch behavior.
- APL/WASM runtime boundary doc that references the existing DEVFLOW-FINANCE bridge.

## Protocol and plugins

- Protocol: `docs/kitty-protocol-v1.md`
- APL/WASM boundary: `docs/apl-wasm-runtime.md`
- Rust NATS bridge: `docs/nats-rust-bridge.md`
- APL/WASM plugin manifest: `plugins/vm/apl-wasm/kitty.plugin.json`
- VSCode plugin manifest: `plugins/ide/vscode/kitty.plugin.json`
- Rust VM plugin manifest: `plugins/vm/rust/kitty.plugin.json`

TypeScript is used for UI/IPC/NATS coordination only. It is not the source of truth for APL financial logic, sealing, or proof evaluation.

## Run

```powershell
npm install
npm test
npm run dev
```

Optional local NATS:

```powershell
docker run --rm -p 4222:4222 nats:2-alpine
$env:NATS_URL = "nats://127.0.0.1:4222"
npm run dev
```

## Security boundaries

- Renderer has no direct Node access.
- Runtime routes through typed IPC messages.
- Bridge execution is simulated until target adapters are explicitly implemented.
- NATS messages are structured envelopes; signing can be added at the envelope layer.
- IDE control should stay LSP-only.
- Shell execution is intentionally absent from this scaffold.

![](https://sovereign-analytics.snapkittywest.workers.dev/canary/kittybrowse)
