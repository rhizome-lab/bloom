//! Build automation tasks.
//!
//! Run with: cargo xtask <task>

use std::env;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();

    if args.is_empty() {
        println!("Usage: cargo xtask <task>");
        println!();
        println!("Available tasks:");
        println!("  check    - Run all checks");
        println!("  test     - Run tests");
        return;
    }

    match args[0].as_str() {
        "check" => {
            println!("Running checks...");
            // TODO
        }
        "test" => {
            println!("Running tests...");
            // TODO
        }
        _ => {
            eprintln!("Unknown task: {}", args[0]);
        }
    }
}
