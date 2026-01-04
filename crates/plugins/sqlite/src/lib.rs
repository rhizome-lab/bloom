//! SQLite plugin for Viwo with capability-based security.

use rusqlite::{Connection, ToSql};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

/// Global connection pool indexed by database path
static CONNECTIONS: Mutex<Option<HashMap<String, Connection>>> = Mutex::new(None);

/// Initialize the connection pool
fn init_connections() {
    let mut conns = CONNECTIONS.lock().unwrap();
    if conns.is_none() {
        *conns = Some(HashMap::new());
    }
}

/// Validate that a capability grants access to a database path
fn validate_capability(
    capability: &serde_json::Value,
    current_entity_id: i64,
    requested_path: &str,
) -> Result<(), String> {
    // Check ownership
    let owner_id = capability["owner_id"]
        .as_i64()
        .ok_or("sqlite: capability missing owner_id")?;
    if owner_id != current_entity_id {
        return Err("sqlite: capability does not belong to current entity".to_string());
    }

    // Check path matches allowed path
    let allowed_path = capability["params"]["path"]
        .as_str()
        .ok_or("sqlite: capability missing path parameter")?;

    // Canonicalize paths for comparison
    let resolved_target = PathBuf::from(requested_path)
        .canonicalize()
        .map_err(|_| format!("sqlite: database path does not exist: {}", requested_path))?;
    let resolved_allowed = PathBuf::from(allowed_path)
        .canonicalize()
        .map_err(|_| format!("sqlite: invalid allowed path: {}", allowed_path))?;

    if resolved_target != resolved_allowed {
        return Err(format!(
            "sqlite: path '{}' not allowed by capability",
            requested_path
        ));
    }

    Ok(())
}

/// Get or create a connection to a database
fn get_connection(db_path: &str) -> Result<&'static mut Connection, String> {
    init_connections();

    let mut conns_lock = CONNECTIONS.lock().unwrap();
    let conns = conns_lock.as_mut().unwrap();

    // This is safe because we hold the lock and connections live for the program lifetime
    if !conns.contains_key(db_path) {
        let conn = Connection::open(db_path)
            .map_err(|e| format!("sqlite: failed to open database: {}", e))?;
        conns.insert(db_path.to_string(), conn);
    }

    // SAFETY: We hold the mutex lock, so we have exclusive access
    // The connection is stored in a static HashMap and won't be dropped
    let conn_ptr = conns.get_mut(db_path).unwrap() as *mut Connection;
    unsafe { Ok(&mut *conn_ptr) }
}

/// Execute a SQL query and return results as JSON
pub fn sqlite_query(
    capability: &serde_json::Value,
    entity_id: i64,
    db_path: &str,
    query: &str,
    params: &[serde_json::Value],
) -> Result<Vec<serde_json::Value>, String> {
    validate_capability(capability, entity_id, db_path)?;

    let conn = get_connection(db_path)?;

    // Convert JSON params to rusqlite params
    let sql_params: Vec<Box<dyn ToSql>> = params
        .iter()
        .map(|p| -> Box<dyn ToSql> {
            match p {
                serde_json::Value::Null => Box::new(rusqlite::types::Null),
                serde_json::Value::Bool(b) => Box::new(*b),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        Box::new(i)
                    } else if let Some(f) = n.as_f64() {
                        Box::new(f)
                    } else {
                        Box::new(rusqlite::types::Null)
                    }
                }
                serde_json::Value::String(s) => Box::new(s.clone()),
                _ => Box::new(rusqlite::types::Null),
            }
        })
        .collect();

    let param_refs: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn
        .prepare(query)
        .map_err(|e| format!("sqlite: failed to prepare query: {}", e))?;

    let column_count = stmt.column_count();
    let column_names: Vec<String> = (0..column_count)
        .map(|i| stmt.column_name(i).unwrap_or("").to_string())
        .collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            let mut obj = serde_json::Map::new();
            for (i, name) in column_names.iter().enumerate() {
                let value: serde_json::Value = match row.get_ref(i).unwrap() {
                    rusqlite::types::ValueRef::Null => serde_json::Value::Null,
                    rusqlite::types::ValueRef::Integer(n) => serde_json::json!(n),
                    rusqlite::types::ValueRef::Real(f) => serde_json::json!(f),
                    rusqlite::types::ValueRef::Text(s) => {
                        serde_json::json!(String::from_utf8_lossy(s))
                    }
                    rusqlite::types::ValueRef::Blob(b) => {
                        // Return blob as base64 string
                        serde_json::json!(base64_encode(b))
                    }
                };
                obj.insert(name.clone(), value);
            }
            Ok(serde_json::Value::Object(obj))
        })
        .map_err(|e| format!("sqlite: query failed: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("sqlite: failed to collect rows: {}", e))
}

/// Execute a SQL statement (INSERT, UPDATE, DELETE) and return rows affected
pub fn sqlite_execute(
    capability: &serde_json::Value,
    entity_id: i64,
    db_path: &str,
    query: &str,
    params: &[serde_json::Value],
) -> Result<i64, String> {
    validate_capability(capability, entity_id, db_path)?;

    let conn = get_connection(db_path)?;

    // Convert JSON params to rusqlite params
    let sql_params: Vec<Box<dyn ToSql>> = params
        .iter()
        .map(|p| -> Box<dyn ToSql> {
            match p {
                serde_json::Value::Null => Box::new(rusqlite::types::Null),
                serde_json::Value::Bool(b) => Box::new(*b),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        Box::new(i)
                    } else if let Some(f) = n.as_f64() {
                        Box::new(f)
                    } else {
                        Box::new(rusqlite::types::Null)
                    }
                }
                serde_json::Value::String(s) => Box::new(s.clone()),
                _ => Box::new(rusqlite::types::Null),
            }
        })
        .collect();

    let param_refs: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref()).collect();

    let rows_affected = conn
        .execute(query, param_refs.as_slice())
        .map_err(|e| format!("sqlite: execute failed: {}", e))?;

    Ok(rows_affected as i64)
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();

    for chunk in data.chunks(3) {
        let mut buf = [0u8; 3];
        for (i, &byte) in chunk.iter().enumerate() {
            buf[i] = byte;
        }

        result.push(CHARS[(buf[0] >> 2) as usize] as char);
        result.push(CHARS[(((buf[0] & 0x03) << 4) | (buf[1] >> 4)) as usize] as char);
        result.push(if chunk.len() > 1 {
            CHARS[(((buf[1] & 0x0f) << 2) | (buf[2] >> 6)) as usize] as char
        } else {
            '='
        });
        result.push(if chunk.len() > 2 {
            CHARS[(buf[2] & 0x3f) as usize] as char
        } else {
            '='
        });
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn create_test_capability(owner_id: i64, path: &str) -> serde_json::Value {
        serde_json::json!({
            "owner_id": owner_id,
            "params": {
                "path": path
            }
        })
    }

    #[test]
    fn test_sqlite_query() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_str().unwrap();
        let cap = create_test_capability(1, db_path);

        // Create table
        sqlite_execute(&cap, 1, db_path, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)", &[])
            .unwrap();

        // Insert data
        sqlite_execute(
            &cap,
            1,
            db_path,
            "INSERT INTO users (name) VALUES (?)",
            &[serde_json::json!("Alice")],
        )
        .unwrap();

        // Query data
        let results = sqlite_query(&cap, 1, db_path, "SELECT * FROM users", &[]).unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0]["name"], "Alice");
        assert_eq!(results[0]["id"], 1);
    }

    #[test]
    fn test_sqlite_execute() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_str().unwrap();
        let cap = create_test_capability(1, db_path);

        sqlite_execute(&cap, 1, db_path, "CREATE TABLE test (id INTEGER)", &[]).unwrap();

        let rows = sqlite_execute(&cap, 1, db_path, "INSERT INTO test VALUES (1), (2), (3)", &[])
            .unwrap();

        assert_eq!(rows, 3);
    }

    #[test]
    fn test_sqlite_capability_validation() {
        let temp_db1 = NamedTempFile::new().unwrap();
        let temp_db2 = NamedTempFile::new().unwrap();

        let db1_path = temp_db1.path().to_str().unwrap();
        let db2_path = temp_db2.path().to_str().unwrap();

        let cap = create_test_capability(1, db1_path);

        // Try to access different database
        let result = sqlite_query(&cap, 1, db2_path, "SELECT 1", &[]);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not allowed"));

        // Try with wrong entity ID
        let result = sqlite_query(&cap, 2, db1_path, "SELECT 1", &[]);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not belong"));
    }

    #[test]
    fn test_sqlite_params() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_str().unwrap();
        let cap = create_test_capability(1, db_path);

        sqlite_execute(
            &cap,
            1,
            db_path,
            "CREATE TABLE test (id INTEGER, name TEXT, value REAL)",
            &[],
        )
        .unwrap();

        sqlite_execute(
            &cap,
            1,
            db_path,
            "INSERT INTO test VALUES (?, ?, ?)",
            &[serde_json::json!(42), serde_json::json!("test"), serde_json::json!(3.14)],
        )
        .unwrap();

        let results = sqlite_query(&cap, 1, db_path, "SELECT * FROM test WHERE id = ?", &[serde_json::json!(42)])
            .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0]["id"], 42);
        assert_eq!(results[0]["name"], "test");
    }
}
