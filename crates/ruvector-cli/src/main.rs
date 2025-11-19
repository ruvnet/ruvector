//! Ruvector CLI

use clap::Parser;

#[derive(Parser)]
#[command(name = "ruvector")]
#[command(about = "High-performance Rust vector database CLI", long_about = None)]
struct Cli {
    /// Command to execute
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(clap::Subcommand)]
enum Commands {
    /// Show version information
    Version,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Version) | None => {
            println!("Ruvector v{}", env!("CARGO_PKG_VERSION"));
        }
    }
}
