export type PluginType = "vm" | "ide";

export type RuntimePlugin = {
  id: string;
  type: PluginType;
  target: string;
  commands: string[];
  transport: "stdio" | "lsp" | "nats" | "wasm";
};

export const BUILTIN_PLUGINS: RuntimePlugin[] = [
  {
    id: "kitty.vm.apl-wasm",
    type: "vm",
    target: "apl-wasm",
    commands: ["execute_resonance_vm", "analyze_finance_vector", "render_agent_page"],
    transport: "wasm",
  },
  {
    id: "kitty.vm.rust",
    type: "vm",
    target: "rust",
    commands: ["execute_resonance_vm", "render_agent_page"],
    transport: "stdio",
  },
  {
    id: "kitty.vm.python",
    type: "vm",
    target: "python",
    commands: ["execute_resonance_vm", "inspect_workspace", "render_agent_page"],
    transport: "stdio",
  },
  {
    id: "kitty.vm.wasm",
    type: "vm",
    target: "wasm",
    commands: ["execute_resonance_vm", "render_agent_page"],
    transport: "stdio",
  },
  {
    id: "kitty.vm.docker",
    type: "vm",
    target: "docker",
    commands: ["execute_resonance_vm"],
    transport: "stdio",
  },
  {
    id: "kitty.ide.vscode",
    type: "ide",
    target: "vscode",
    commands: ["open_lsp_context", "inspect_workspace"],
    transport: "lsp",
  },
  {
    id: "kitty.ide.neovim",
    type: "ide",
    target: "neovim",
    commands: ["open_lsp_context", "inspect_workspace"],
    transport: "lsp",
  },
  {
    id: "kitty.ide.jetbrains",
    type: "ide",
    target: "jetbrains",
    commands: ["open_lsp_context", "inspect_workspace"],
    transport: "lsp",
  },
];

export function commandAllowed(command: string, vmTarget: string, ideTarget: string): boolean {
  return BUILTIN_PLUGINS.some((plugin) => {
    const targetMatches = plugin.target === vmTarget || plugin.target === ideTarget;
    return targetMatches && plugin.commands.includes(command);
  });
}
