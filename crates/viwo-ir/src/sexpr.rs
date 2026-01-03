//! S-expression types.

use serde::{Deserialize, Serialize};

/// An S-expression node.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SExpr {
    /// Null value
    Null,
    /// Boolean value
    Bool(bool),
    /// Numeric value
    Number(f64),
    /// String value
    String(String),
    /// List (opcode call or array)
    List(Vec<SExpr>),
}

impl SExpr {
    /// Returns the opcode name if this is an opcode call.
    pub fn opcode(&self) -> Option<&str> {
        match self {
            SExpr::List(items) if !items.is_empty() => {
                if let SExpr::String(s) = &items[0] {
                    Some(s.as_str())
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    /// Returns the arguments if this is an opcode call.
    pub fn args(&self) -> Option<&[SExpr]> {
        match self {
            SExpr::List(items) if !items.is_empty() => Some(&items[1..]),
            _ => None,
        }
    }
}
