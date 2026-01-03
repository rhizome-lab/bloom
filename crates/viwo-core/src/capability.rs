//! Capability-based authorization.

use serde::{Deserialize, Serialize};

/// A capability token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capability {
    pub id: i64,
    pub name: String,
    pub params: serde_json::Value,
}
