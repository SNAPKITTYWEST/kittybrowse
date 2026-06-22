use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub const TASK_RUN: &str = "kitty.task.run";
pub const TASK_RESULT: &str = "kitty.task.result";
pub const DEFAULT_NATS_URL: &str = "nats://127.0.0.1:4222";

const DEFAULT_THRESHOLD: f64 = 0.21;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskEnvelope {
    pub subject: String,
    pub issued_at: String,
    pub task: TaskRequest,
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRequest {
    pub id: String,
    pub context_id: String,
    pub command: String,
    pub payload: Value,
    pub dependencies: Vec<String>,
    pub fail_rate: f64,
    pub latency_ms: f64,
    pub vm_target: String,
    pub ide_target: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskResult {
    pub id: String,
    pub context_id: String,
    pub status: String,
    pub entropy: f64,
    pub message: String,
    pub output: Value,
    pub completed_at: String,
}

pub fn entropy_score(task: &TaskRequest) -> f64 {
    let dependency_pressure = clamp01(task.dependencies.len() as f64 / 10.0);
    let fail_pressure = clamp01(task.fail_rate);
    let latency_pressure = clamp01(task.latency_ms / 10_000.0);

    round4((dependency_pressure * 0.3) + (fail_pressure * 0.5) + (latency_pressure * 0.2))
}

pub fn is_executable(task: &TaskRequest) -> bool {
    entropy_score(task) < DEFAULT_THRESHOLD
}

pub fn process_envelope(envelope: TaskEnvelope) -> TaskResult {
    let entropy = entropy_score(&envelope.task);
    let completed_at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    if !is_executable(&envelope.task) {
        return TaskResult {
            id: envelope.task.id,
            context_id: envelope.task.context_id,
            status: "blocked".to_string(),
            entropy,
            message: "Entropy threshold blocked Rust bridge execution".to_string(),
            output: json!({
                "threshold": DEFAULT_THRESHOLD,
                "bridge": "rust-vm-bridge",
                "vmTarget": envelope.task.vm_target,
                "ideTarget": envelope.task.ide_target,
            }),
            completed_at,
        };
    }

    if !command_allowed(&envelope.task.command, &envelope.task.vm_target, &envelope.task.ide_target) {
        return TaskResult {
            id: envelope.task.id,
            context_id: envelope.task.context_id,
            status: "failed".to_string(),
            entropy,
            message: format!(
                "Command is not allowlisted for {}/{}: {}",
                envelope.task.vm_target, envelope.task.ide_target, envelope.task.command
            ),
            output: json!({
                "bridge": "rust-vm-bridge",
                "rawShell": false,
            }),
            completed_at,
        };
    }

    let payload_hash = sha256_hex(&envelope.task.payload.to_string());
    TaskResult {
        id: envelope.task.id,
        context_id: envelope.task.context_id,
        status: "succeeded".to_string(),
        entropy,
        message: format!(
            "{} accepted by Rust NATS bridge for {}/{}",
            envelope.task.command, envelope.task.vm_target, envelope.task.ide_target
        ),
        output: json!({
            "bridge": "rust-vm-bridge",
            "runtimeAuthority": if envelope.task.vm_target == "apl-wasm" {
                "APL/Rust/WASM substrate"
            } else {
                "Rust plugin adapter"
            },
            "rawShell": false,
            "subjectIn": TASK_RUN,
            "subjectOut": TASK_RESULT,
            "payloadSha256": payload_hash,
        }),
        completed_at,
    }
}

pub fn parse_envelope(bytes: &[u8]) -> Result<TaskEnvelope> {
    serde_json::from_slice(bytes).context("invalid kitty.task.run envelope")
}

pub fn encode_result(result: &TaskResult) -> Result<Vec<u8>> {
    serde_json::to_vec(result).context("failed to encode kitty.task.result")
}

pub async fn run_nats_worker(url: &str) -> Result<()> {
    let client = async_nats::connect(url)
        .await
        .with_context(|| format!("failed to connect to NATS at {url}"))?;
    let mut subscriber = client
        .subscribe(TASK_RUN.to_string())
        .await
        .with_context(|| format!("failed to subscribe to {TASK_RUN}"))?;

    eprintln!("[rust-vm-bridge] connected to NATS at {url}; listening on {TASK_RUN}");

    loop {
        tokio::select! {
            Some(message) = futures_util::StreamExt::next(&mut subscriber) => {
                let result = match parse_envelope(&message.payload) {
                    Ok(envelope) => process_envelope(envelope),
                    Err(err) => TaskResult {
                        id: "invalid-envelope".to_string(),
                        context_id: "unknown".to_string(),
                        status: "failed".to_string(),
                        entropy: 1.0,
                        message: err.to_string(),
                        output: json!({
                            "bridge": "rust-vm-bridge",
                            "rawShell": false,
                        }),
                        completed_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                    },
                };
                client.publish(TASK_RESULT.to_string(), encode_result(&result)?.into()).await?;
            }
            _ = tokio::signal::ctrl_c() => {
                eprintln!("[rust-vm-bridge] shutdown requested");
                return Ok(());
            }
        }
    }
}

pub fn run_stdio(input: &str) -> Result<TaskResult> {
    let envelope: TaskEnvelope = serde_json::from_str(input).map_err(|err| {
        anyhow!("stdin mode expects a kitty.task.run TaskEnvelope JSON payload: {err}")
    })?;
    Ok(process_envelope(envelope))
}

fn command_allowed(command: &str, vm_target: &str, ide_target: &str) -> bool {
    matches!(
        (command, vm_target),
        ("execute_resonance_vm", "apl-wasm")
            | ("analyze_finance_vector", "apl-wasm")
            | ("render_agent_page", "apl-wasm")
            | ("execute_resonance_vm", "rust")
            | ("render_agent_page", "rust")
    ) || matches!(
        (command, ide_target),
        ("inspect_workspace", "vscode")
            | ("open_lsp_context", "vscode")
            | ("inspect_workspace", "neovim")
            | ("open_lsp_context", "neovim")
            | ("inspect_workspace", "jetbrains")
            | ("open_lsp_context", "jetbrains")
    )
}

fn clamp01(value: f64) -> f64 {
    if !value.is_finite() {
        return 1.0;
    }
    value.clamp(0.0, 1.0)
}

fn round4(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_envelope() -> TaskEnvelope {
        TaskEnvelope {
            subject: TASK_RUN.to_string(),
            issued_at: "2026-06-22T00:00:00.000Z".to_string(),
            signature: None,
            task: TaskRequest {
                id: "task-1".to_string(),
                context_id: "agent-1".to_string(),
                command: "execute_resonance_vm".to_string(),
                payload: json!({ "source": "test" }),
                dependencies: vec![],
                fail_rate: 0.0,
                latency_ms: 100.0,
                vm_target: "apl-wasm".to_string(),
                ide_target: "vscode".to_string(),
            },
        }
    }

    #[test]
    fn entropy_matches_typescript_scheduler() {
        let mut envelope = sample_envelope();
        envelope.task.dependencies = vec!["a".to_string(), "b".to_string()];
        envelope.task.fail_rate = 0.1;
        envelope.task.latency_ms = 500.0;

        assert_eq!(entropy_score(&envelope.task), 0.12);
    }

    #[test]
    fn apl_wasm_task_succeeds_without_shell() {
        let result = process_envelope(sample_envelope());

        assert_eq!(result.status, "succeeded");
        assert_eq!(result.output["rawShell"], false);
        assert_eq!(result.output["runtimeAuthority"], "APL/Rust/WASM substrate");
    }

    #[test]
    fn high_entropy_task_blocks() {
        let mut envelope = sample_envelope();
        envelope.task.dependencies = vec!["a".to_string(); 8];
        envelope.task.fail_rate = 0.9;
        envelope.task.latency_ms = 9_000.0;

        let result = process_envelope(envelope);

        assert_eq!(result.status, "blocked");
    }
}
