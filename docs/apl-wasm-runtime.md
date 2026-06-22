# APL/WASM Runtime Boundary

KittyBrowse uses Chromium as the UI shell, not as the execution authority.

The preferred execution target is `apl-wasm`:

```text
Chromium UI
  -> preload IPC
  -> local agent runtime
  -> NATS subject
  -> APL/Rust/WASM plugin boundary
  -> sealed result
```

## Existing source references

- APL finance semantics: `DEVFLOW-FINANCE/bridges/apl/finance.apl`
- Rust APL bridge: `DEVFLOW-FINANCE/bridges/rust/apl_bridge.rs`
- Browser WASM substrate: `DEVFLOW-FINANCE/snapkitty-wasm/src/lib.rs`
- Published browser artifact: `DEVFLOW-FINANCE/collectivekitty/public/wasm/snapkitty_wasm_bg.wasm`

## Rule

JavaScript/TypeScript may coordinate UI, IPC, and NATS envelopes. It must not become the computation source of truth for APL financial logic, sealing, or proof evaluation.

