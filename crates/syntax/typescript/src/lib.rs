//! TypeScript to S-expression transpiler.
//!
//! Uses tree-sitter for parsing TypeScript, then transforms
//! the CST into Viwo S-expressions.

use thiserror::Error;
use viwo_ir::SExpr;

#[derive(Debug, Error)]
pub enum TranspileError {
    #[error("parse error: {0}")]
    Parse(String),

    #[error("unsupported syntax: {0}")]
    Unsupported(String),
}

/// Transpile TypeScript source to S-expressions.
pub fn transpile(_source: &str) -> Result<SExpr, TranspileError> {
    // TODO: implement tree-sitter parsing
    Ok(SExpr::Null)
}
