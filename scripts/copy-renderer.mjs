import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const project = join(root, "..");

await mkdir(join(project, "dist", "renderer"), { recursive: true });
await cp(join(project, "src", "renderer"), join(project, "dist", "renderer"), {
  recursive: true,
});

