//! LuaJIT execution target for Viwo.
//!
//! Compiles S-expressions to Lua and executes via LuaJIT.

use mlua::{Lua, Result as LuaResult};
use thiserror::Error;
use viwo_ir::SExpr;

#[derive(Debug, Error)]
pub enum ExecutionError {
    #[error("lua error: {0}")]
    Lua(#[from] mlua::Error),

    #[error("compilation error: {0}")]
    Compile(String),
}

/// Compile an S-expression to Lua source code.
pub fn compile(expr: &SExpr) -> Result<String, ExecutionError> {
    // TODO: implement codegen
    let _ = expr;
    Ok("-- compiled lua".to_string())
}

/// Execute an S-expression using LuaJIT.
pub fn execute(expr: &SExpr) -> Result<mlua::Value, ExecutionError> {
    let lua = Lua::new();
    let code = compile(expr)?;
    let result = lua.load(&code).eval()?;
    Ok(result)
}

/// Create a new Lua runtime with Viwo stdlib loaded.
pub fn create_runtime() -> LuaResult<Lua> {
    let lua = Lua::new();
    // TODO: load viwo stdlib
    Ok(lua)
}
