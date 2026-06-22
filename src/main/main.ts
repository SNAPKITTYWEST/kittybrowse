import { app, BrowserWindow, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KittyRuntime } from "../runtime/agent-runtime.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | undefined;
let runtime: KittyRuntime | undefined;

async function createWindow(): Promise<void> {
  runtime = await KittyRuntime.create();
  runtime.createContext({
    label: "Primary Agent",
    url: "kitty://home",
    vmTarget: "apl-wasm",
    ideTarget: "vscode",
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "KittyBrowse",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await mainWindow.loadFile(join(__dirname, "..", "..", "renderer", "index.html"));
}

ipcMain.handle("kitty:snapshot", () => runtime?.snapshot());

ipcMain.handle("kitty:create-context", (_event, input) => {
  return runtime?.createContext(input);
});

ipcMain.handle("kitty:submit-task", async (_event, input) => {
  if (!runtime) {
    throw new Error("Kitty runtime is not ready");
  }
  return runtime.submitTask(input);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", async () => {
  if (runtime) {
    await runtime.stop();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
