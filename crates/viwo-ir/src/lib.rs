//! S-expression IR types and validation for Viwo.
//!
//! This crate defines the intermediate representation used between
//! syntax frontends (TypeScript, etc.) and execution targets (LuaJIT, JS).

pub mod sexpr;
pub mod opcodes;
pub mod validation;

pub use sexpr::SExpr;
