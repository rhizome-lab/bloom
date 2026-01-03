//! S-expression validation.

use crate::SExpr;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("unknown opcode: {0}")]
    UnknownOpcode(String),

    #[error("invalid argument count for {opcode}: expected {expected}, got {got}")]
    InvalidArgCount {
        opcode: String,
        expected: usize,
        got: usize,
    },
}

/// Validate an S-expression.
pub fn validate(_expr: &SExpr) -> Result<(), ValidationError> {
    // TODO: implement validation
    Ok(())
}
