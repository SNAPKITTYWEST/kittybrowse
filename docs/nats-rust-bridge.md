# Rust NATS Bridge

`crates/rust-vm-bridge` is the native worker for KittyBrowse task dispatch.

It uses `async-nats`, Synadia's modern async Rust client. Do not use the old synchronous `nats` crate here.

## Subjects

```text
kitty.task.run     -> TaskEnvelope JSON
kitty.task.result  -> TaskResult JSON
```

## Run With NATS

```powershell
$env:NATS_URL = "nats://127.0.0.1:4222"
cargo run --manifest-path crates/rust-vm-bridge/Cargo.toml -- --nats
```

If DEVFLOW-FINANCE is running the authenticated NATS container, use the same `NATS_URL` shape it uses in Docker, for example:

```powershell
$env:NATS_URL = "nats://<token>@127.0.0.1:4222"
```

## Offline STDIN Mode

```powershell
Get-Content sample-task.json -Raw | cargo run --manifest-path crates/rust-vm-bridge/Cargo.toml
```

STDIN mode expects the same `TaskEnvelope` JSON that NATS carries.

## Boundary

- No raw shell execution.
- `apl-wasm` is the preferred execution target.
- Rust publishes structured `TaskResult` JSON only.
- TypeScript remains UI/IPC/NATS envelope glue.
