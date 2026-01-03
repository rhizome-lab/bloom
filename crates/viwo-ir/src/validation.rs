//! S-expression validation.

use crate::SExpr;
use thiserror::Error;

/// Errors that can occur during validation.
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

    #[error("invalid argument type for {opcode} at position {position}: expected {expected}")]
    InvalidArgType {
        opcode: String,
        position: usize,
        expected: String,
    },

    #[error("empty opcode call")]
    EmptyCall,

    #[error("opcode name must be a string")]
    InvalidOpcodeName,
}

/// Validate an S-expression for structural correctness.
///
/// This performs basic validation:
/// - Opcode calls must have a string as the first element
/// - Recursively validates nested expressions
///
/// Note: This does NOT validate that opcodes exist or have correct arity.
/// That requires an opcode registry and is done at runtime.
pub fn validate(expr: &SExpr) -> Result<(), ValidationError> {
    match expr {
        SExpr::Null | SExpr::Bool(_) | SExpr::Number(_) | SExpr::String(_) => Ok(()),
        SExpr::Object(map) => {
            for value in map.values() {
                validate(value)?;
            }
            Ok(())
        }
        SExpr::List(items) => {
            if items.is_empty() {
                // Empty list is valid (represents empty array)
                return Ok(());
            }

            // If first element is a string, treat as opcode call
            if let SExpr::String(_) = &items[0] {
                // Validate arguments recursively
                for arg in &items[1..] {
                    validate(arg)?;
                }
            } else {
                // Not an opcode call, validate all elements
                for item in items {
                    validate(item)?;
                }
            }

            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_literals() {
        assert!(validate(&SExpr::Null).is_ok());
        assert!(validate(&SExpr::Bool(true)).is_ok());
        assert!(validate(&SExpr::Number(42.0)).is_ok());
        assert!(validate(&SExpr::String("hello".into())).is_ok());
    }

    #[test]
    fn test_validate_opcode_call() {
        let expr = SExpr::call("std.let", vec![
            SExpr::string("x"),
            SExpr::number(10),
        ]);
        assert!(validate(&expr).is_ok());
    }

    #[test]
    fn test_validate_nested() {
        let expr = SExpr::call("std.seq", vec![
            SExpr::call("std.let", vec![SExpr::string("x"), SExpr::number(10)]),
            SExpr::call("math.add", vec![
                SExpr::call("std.var", vec![SExpr::string("x")]),
                SExpr::number(5),
            ]),
        ]);
        assert!(validate(&expr).is_ok());
    }
}
