//! Entity types and prototype chain.

use serde::{Deserialize, Serialize};

/// Entity ID.
pub type EntityId = i64;

/// An entity in the world.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: EntityId,
    pub parent_id: Option<EntityId>,
    pub name: String,
    pub description: String,
    pub props: serde_json::Value,
}
