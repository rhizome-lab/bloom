//! S-expression types.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// An S-expression node.
///
/// This is the core intermediate representation for ViwoScript.
/// All script code is represented as nested S-expressions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SExpr {
    /// Null value
    Null,
    /// Boolean value
    Bool(bool),
    /// Numeric value (IEEE 754 double)
    Number(f64),
    /// String value
    String(String),
    /// Object/map value
    Object(HashMap<String, SExpr>),
    /// List - either an opcode call or a literal array
    /// First element of an opcode call is the opcode name (string)
    List(Vec<SExpr>),
}

impl SExpr {
    /// Creates a null value.
    pub fn null() -> Self {
        SExpr::Null
    }

    /// Creates a boolean value.
    pub fn bool(value: bool) -> Self {
        SExpr::Bool(value)
    }

    /// Creates a number value.
    pub fn number(value: impl Into<f64>) -> Self {
        SExpr::Number(value.into())
    }

    /// Creates a string value.
    pub fn string(value: impl Into<String>) -> Self {
        SExpr::String(value.into())
    }

    /// Creates an opcode call.
    pub fn call(opcode: impl Into<String>, args: Vec<SExpr>) -> Self {
        let mut list = vec![SExpr::String(opcode.into())];
        list.extend(args);
        SExpr::List(list)
    }

    /// Returns true if this is a null value.
    pub fn is_null(&self) -> bool {
        matches!(self, SExpr::Null)
    }

    /// Returns true if this is an opcode call (list starting with a string).
    pub fn is_call(&self) -> bool {
        matches!(self, SExpr::List(items) if !items.is_empty() && matches!(&items[0], SExpr::String(_)))
    }

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
            SExpr::List(items) if !items.is_empty() && matches!(&items[0], SExpr::String(_)) => {
                Some(&items[1..])
            }
            _ => None,
        }
    }

    /// Returns the inner boolean value if this is a Bool.
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            SExpr::Bool(b) => Some(*b),
            _ => None,
        }
    }

    /// Returns the inner number value if this is a Number.
    pub fn as_number(&self) -> Option<f64> {
        match self {
            SExpr::Number(n) => Some(*n),
            _ => None,
        }
    }

    /// Returns the inner string value if this is a String.
    pub fn as_str(&self) -> Option<&str> {
        match self {
            SExpr::String(s) => Some(s.as_str()),
            _ => None,
        }
    }

    /// Returns the inner list if this is a List.
    pub fn as_list(&self) -> Option<&[SExpr]> {
        match self {
            SExpr::List(items) => Some(items),
            _ => None,
        }
    }

    /// Returns the inner object if this is an Object.
    pub fn as_object(&self) -> Option<&HashMap<String, SExpr>> {
        match self {
            SExpr::Object(map) => Some(map),
            _ => None,
        }
    }
}

impl Default for SExpr {
    fn default() -> Self {
        SExpr::Null
    }
}

impl From<bool> for SExpr {
    fn from(value: bool) -> Self {
        SExpr::Bool(value)
    }
}

impl From<i32> for SExpr {
    fn from(value: i32) -> Self {
        SExpr::Number(value as f64)
    }
}

impl From<i64> for SExpr {
    fn from(value: i64) -> Self {
        SExpr::Number(value as f64)
    }
}

impl From<f64> for SExpr {
    fn from(value: f64) -> Self {
        SExpr::Number(value)
    }
}

impl From<&str> for SExpr {
    fn from(value: &str) -> Self {
        SExpr::String(value.to_string())
    }
}

impl From<String> for SExpr {
    fn from(value: String) -> Self {
        SExpr::String(value)
    }
}

impl<T: Into<SExpr>> From<Vec<T>> for SExpr {
    fn from(value: Vec<T>) -> Self {
        SExpr::List(value.into_iter().map(Into::into).collect())
    }
}

impl From<HashMap<String, SExpr>> for SExpr {
    fn from(value: HashMap<String, SExpr>) -> Self {
        SExpr::Object(value)
    }
}
