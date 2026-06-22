use anyhow::Result;
use rust_vm_bridge::{run_nats_worker, run_stdio, DEFAULT_NATS_URL};
use std::io::{self, Read};

#[tokio::main]
async fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let nats_mode = args.iter().any(|arg| arg == "--nats");

    if nats_mode {
        let url = std::env::var("NATS_URL").unwrap_or_else(|_| DEFAULT_NATS_URL.to_string());
        return run_nats_worker(&url).await;
    }

    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    let result = run_stdio(&input)?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
