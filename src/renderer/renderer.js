const api = window.kitty;

const meshKind = document.querySelector("#mesh-kind");
const contextCount = document.querySelector("#context-count");
const taskCount = document.querySelector("#task-count");
const contexts = document.querySelector("#contexts");
const results = document.querySelector("#results");

let currentContextId = null;

function renderSnapshot(snapshot) {
  meshKind.textContent = snapshot.mesh;
  contextCount.textContent = String(snapshot.contexts.length);
  taskCount.textContent = String(snapshot.results.length);

  currentContextId = currentContextId ?? snapshot.contexts[0]?.id ?? null;

  contexts.replaceChildren(
    ...snapshot.contexts.map((context) => {
      const node = document.createElement("div");
      node.className = "item";
      node.innerHTML = `
        <strong>${context.label}</strong>
        <div class="subtle">${context.id}</div>
        <div>URL: ${context.url}</div>
        <div>VM: ${context.vmTarget} / IDE: ${context.ideTarget}</div>
        <div>Entropy: ${context.entropy}</div>
      `;
      node.addEventListener("click", () => {
        currentContextId = context.id;
      });
      return node;
    }),
  );

  results.replaceChildren(
    ...snapshot.results.map((result) => {
      const node = document.createElement("div");
      node.className = "item";
      node.innerHTML = `
        <strong class="status-${result.status}">${result.status}: ${result.id}</strong>
        <div>${result.message}</div>
        <div class="subtle">Entropy ${result.entropy}</div>
      `;
      return node;
    }),
  );
}

async function refresh() {
  const snapshot = await api.snapshot();
  renderSnapshot(snapshot);
}

document.querySelector("#new-context").addEventListener("click", async () => {
  const context = await api.createContext({
    label: `Agent Context ${Date.now().toString().slice(-4)}`,
    url: "kitty://task",
    vmTarget: document.querySelector("#vm-target").value,
    ideTarget: document.querySelector("#ide-target").value,
  });
  currentContextId = context.id;
  await refresh();
});

document.querySelector("#run-task").addEventListener("click", async () => {
  await api.submitTask({
    contextId: currentContextId,
    command: document.querySelector("#command").value,
    payload: { source: "renderer", pointer: "kitty://task" },
    dependencies: [],
    failRate: Number(document.querySelector("#fail-rate").value),
    latencyMs: Number(document.querySelector("#latency").value),
    vmTarget: document.querySelector("#vm-target").value,
    ideTarget: document.querySelector("#ide-target").value,
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  await refresh();
});

refresh();
setInterval(refresh, 1500);

