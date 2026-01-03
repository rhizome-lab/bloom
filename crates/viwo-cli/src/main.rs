//! Viwo CLI entry point.

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "viwo")]
#[command(about = "Viwo runtime CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the server
    Serve {
        /// Port to listen on
        #[arg(short, long, default_value = "8080")]
        port: u16,

        /// Plugin directory
        #[arg(long)]
        plugins: Option<String>,
    },

    /// Transpile TypeScript to S-expressions
    Transpile {
        /// Input file(s)
        #[arg(required = true)]
        files: Vec<String>,

        /// Output directory
        #[arg(short, long)]
        out: Option<String>,
    },

    /// Compile S-expressions to Lua
    Compile {
        /// Input file(s)
        #[arg(required = true)]
        files: Vec<String>,

        /// Output directory
        #[arg(short, long)]
        out: Option<String>,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Serve { port, plugins } => {
            println!("Starting server on port {port}");
            if let Some(p) = plugins {
                println!("Loading plugins from: {p}");
            }
            // TODO: start server
        }
        Commands::Transpile { files, out } => {
            println!("Transpiling {} file(s)", files.len());
            if let Some(o) = out {
                println!("Output: {o}");
            }
            // TODO: transpile
        }
        Commands::Compile { files, out } => {
            println!("Compiling {} file(s)", files.len());
            if let Some(o) = out {
                println!("Output: {o}");
            }
            // TODO: compile
        }
    }
}
