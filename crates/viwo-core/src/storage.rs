//! SQLite storage layer.

use rusqlite::Connection;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
}

/// World storage backed by SQLite.
pub struct WorldStorage {
    conn: Connection,
}

impl WorldStorage {
    /// Open or create a world database.
    pub fn open(path: &str) -> Result<Self, StorageError> {
        let conn = Connection::open(path)?;
        Ok(Self { conn })
    }

    /// Open an in-memory database.
    pub fn in_memory() -> Result<Self, StorageError> {
        let conn = Connection::open_in_memory()?;
        Ok(Self { conn })
    }
}
