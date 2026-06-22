import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("kitty", {
  snapshot: () => ipcRenderer.invoke("kitty:snapshot"),
  createContext: (input: unknown) => ipcRenderer.invoke("kitty:create-context", input),
  submitTask: (input: unknown) => ipcRenderer.invoke("kitty:submit-task", input),
});

