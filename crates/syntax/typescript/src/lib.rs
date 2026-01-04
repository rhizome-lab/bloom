//! TypeScript to S-expression transpiler.
//!
//! Uses tree-sitter for parsing TypeScript, then transforms
//! the CST into Viwo S-expressions.

mod transpiler;

pub use transpiler::{transpile, TranspileError};

#[cfg(test)]
mod tests;
