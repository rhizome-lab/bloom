//! TypeScript entity definition parser for Lotus.
//!
//! Parses TypeScript class definitions into EntityDefinition structures
//! containing props and verbs. Uses reed for transpilation.

pub mod entity_definition;

pub use entity_definition::{EntityDefError, EntityDefinition, parse_entity_definition};
