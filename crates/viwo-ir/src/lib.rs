//! S-expression IR types and validation for Viwo.
//!
//! This crate defines the intermediate representation used between
//! syntax frontends (TypeScript, etc.) and execution targets (LuaJIT, JS).
//!
//! # S-expression format
//!
//! An S-expression is either:
//! - A literal value (null, bool, number, string, object)
//! - An opcode call: `[opcode_name, ...args]`
//!
//! Example:
//! ```json
//! ["std.seq",
//!   ["std.let", "x", 10],
//!   ["math.add", ["std.var", "x"], 5]
//! ]
//! ```

mod sexpr;
mod opcodes;
mod validation;

pub use sexpr::SExpr;
pub use opcodes::CORE_LIBRARIES;
pub use validation::{validate, ValidationError};

#[cfg(test)]
mod tests;
