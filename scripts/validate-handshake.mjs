import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const handshakePath = resolve(projectRoot, process.argv[2] ?? "lineage/kittybrowse-shadow-handshake.json");

async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const handshake = JSON.parse(await readFile(handshakePath, "utf8"));

assert(handshake.protocol === "shadow-grisp/json-handshake-v1", "invalid protocol");
assert(handshake.from?.stone === 4, "from.stone must be 4");
assert(handshake.to?.repo === "shadow-orchestrator", "to.repo must be shadow-orchestrator");
assert(handshake.verification?.apl_wasm_primary === true, "apl_wasm_primary must be true");
assert(handshake.integration?.primary_vm_target === "apl-wasm", "primary VM target must be apl-wasm");
assert(handshake.coreRule?.bob?.includes("executes"), "coreRule.bob must execute");
assert(handshake.nonRecursiveLaw?.forbidden?.includes("Shadow -> Self Modify"), "nonRecursiveLaw missing self-modify ban");

for (const [key, rel] of Object.entries(handshake.provenance?.sourceFiles ?? {})) {
  const expected = handshake.provenance?.sourceHashes?.[key];
  assert(expected, `missing hash for ${key}`);
  const actual = await sha256(resolve(projectRoot, rel));
  assert(actual === expected, `hash mismatch for ${key}: ${actual} !== ${expected}`);
}

console.log(JSON.stringify({
  ok: true,
  handshake: handshakePath,
  mode: handshake.mode,
  checkedHashes: Object.keys(handshake.provenance.sourceHashes).length,
}, null, 2));

