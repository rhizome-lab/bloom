//! Integration tests for filebrowser-server
//!
//! Tests the full end-to-end flow:
//! - Server startup and initialization
//! - WebSocket connection
//! - JSON-RPC method calls (ping, get_entity, call_verb)
//! - Verb execution (look, go, open)

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use tokio::time::timeout;
use tokio_tungstenite::tungstenite::Message;

use viwo_core::seed::{seed_basic_world, SeedSystem};
use viwo_runtime::ViwoRuntime;
use viwo_transport_websocket_jsonrpc::{Server, ServerConfig};

/// Helper to send a JSON-RPC request and get the response
async fn send_request(
    ws: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
        Message,
    >,
    ws_rx: &mut futures_util::stream::SplitStream<
        tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    >,
    method: &str,
    params: serde_json::Value,
    id: i64,
) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let request = json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": id
    });

    ws.send(Message::Text(request.to_string().into())).await?;

    // Wait for response with timeout
    let msg = timeout(Duration::from_secs(5), ws_rx.next())
        .await?
        .ok_or("No response")??;

    if let Message::Text(text) = msg {
        let response: serde_json::Value = serde_json::from_str(&text)?;
        Ok(response)
    } else {
        Err("Expected text message".into())
    }
}

#[tokio::test]
async fn test_server_basic_operations() -> Result<(), Box<dyn std::error::Error>> {
    // Create temporary test directory
    let test_dir = std::env::temp_dir().join("viwo-test-filebrowser");
    let db_path = test_dir.join("test.db");
    let sandbox_path = test_dir.join("sandbox");

    // Clean up from previous runs
    let _ = std::fs::remove_dir_all(&test_dir);
    std::fs::create_dir_all(&sandbox_path)?;

    // Create test files in sandbox
    std::fs::write(sandbox_path.join("test.txt"), "Hello, World!")?;
    std::fs::create_dir(sandbox_path.join("subdir"))?;
    std::fs::write(sandbox_path.join("subdir/nested.txt"), "Nested file")?;

    // Create runtime
    let runtime = Arc::new(ViwoRuntime::open(db_path.to_str().unwrap())?);

    // Load fs plugin
    let plugin_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .unwrap()
        .join("target/debug/libviwo_plugin_fs.so");
    runtime.load_plugin(plugin_path.to_str().unwrap(), "fs")?;

    // Get path to entity definitions
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let workspace_root = manifest_dir
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .unwrap();
    let definitions_path = workspace_root.join("apps/filebrowser-server/src/definitions");

    // Seed the world
    let seed_system = SeedSystem::new(definitions_path);
    let user_id = {
        let storage = runtime.storage();
        let storage_lock = storage.lock().unwrap();

        // Seed basic world
        seed_basic_world(&storage_lock, &seed_system)?;

        // Create FileBrowserBase
        let filebrowser_base_def =
            seed_system.load_definition("FileBrowser.ts", "FileBrowserBase", None)?;
        let filebrowser_base_id =
            seed_system.create_entity(&storage_lock, &filebrowser_base_def, None)?;

        // Create FileBrowserUser
        let filebrowser_user_def =
            seed_system.load_definition("FileBrowser.ts", "FileBrowserUser", None)?;
        let user_id = seed_system.create_entity(
            &storage_lock,
            &filebrowser_user_def,
            Some(filebrowser_base_id),
        )?;

        // Set fs_root and cwd
        let mut user_entity = storage_lock.get_entity(user_id)?.unwrap();
        if let serde_json::Value::Object(ref mut props) = user_entity.props {
            props.insert(
                "fs_root".to_string(),
                json!(sandbox_path.to_str().unwrap()),
            );
            props.insert("cwd".to_string(), json!(sandbox_path.to_str().unwrap()));
        }
        storage_lock.update_entity(user_id, user_entity.props)?;

        user_id
    };

    // Start server on random available port
    let port = 18080;
    let config = ServerConfig {
        host: "127.0.0.1".to_string(),
        port,
        db_path: db_path.to_str().unwrap().to_string(),
    };

    let server = Server::new(runtime.clone(), config);

    // Spawn server in background
    let server_handle = tokio::spawn(async move {
        server.run().await.unwrap();
    });

    // Give server time to start
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Connect to server
    let url = format!("ws://127.0.0.1:{}", port);
    let (ws_stream, _) = tokio_tungstenite::connect_async(&url).await?;
    let (mut ws_tx, mut ws_rx) = ws_stream.split();

    // Test 1: Ping
    let response = send_request(&mut ws_tx, &mut ws_rx, "ping", json!({}), 1).await?;
    assert_eq!(response["result"], "pong");
    assert_eq!(response["id"], 1);
    println!("✓ Ping test passed");

    // Test 2: Get entity
    let response = send_request(
        &mut ws_tx,
        &mut ws_rx,
        "get_entity",
        json!({"id": user_id}),
        2,
    )
    .await?;
    assert!(response["result"].is_object());
    assert_eq!(response["result"]["id"], user_id);
    println!("✓ Get entity test passed");

    // Test 3: Call 'look' verb (list directory)
    let response = send_request(
        &mut ws_tx,
        &mut ws_rx,
        "call_verb",
        json!({
            "entity_id": user_id,
            "verb": "look",
            "args": [],
            "caller_id": user_id
        }),
        3,
    )
    .await?;

    assert!(response["result"].is_object());
    let result = &response["result"];
    assert_eq!(result["type"], "directory_listing");
    assert!(result["entries"].is_array());
    let entries = result["entries"].as_array().unwrap();
    assert_eq!(entries.len(), 2); // test.txt and subdir
    println!("✓ Look verb test passed - found {} entries", entries.len());

    // Test 4: Call 'open' verb (read file)
    let response = send_request(
        &mut ws_tx,
        &mut ws_rx,
        "call_verb",
        json!({
            "entity_id": user_id,
            "verb": "open",
            "args": ["test.txt"],
            "caller_id": user_id
        }),
        4,
    )
    .await?;

    assert!(response["result"].is_object());
    let result = &response["result"];
    assert_eq!(result["type"], "file_content");
    assert_eq!(result["content"], "Hello, World!");
    assert_eq!(result["name"], "test.txt");
    println!("✓ Open verb test passed - read file content");

    // Test 5: Call 'go' verb (change directory)
    let response = send_request(
        &mut ws_tx,
        &mut ws_rx,
        "call_verb",
        json!({
            "entity_id": user_id,
            "verb": "go",
            "args": ["subdir"],
            "caller_id": user_id
        }),
        5,
    )
    .await?;

    assert!(response["result"].is_object());
    let result = &response["result"];
    assert_eq!(result["type"], "directory_listing");
    let entries = result["entries"].as_array().unwrap();
    assert_eq!(entries.len(), 1); // nested.txt
    assert_eq!(entries[0]["name"], "nested.txt");
    println!("✓ Go verb test passed - navigated to subdir");

    // Test 6: Call 'where' verb (get current directory)
    let response = send_request(
        &mut ws_tx,
        &mut ws_rx,
        "call_verb",
        json!({
            "entity_id": user_id,
            "verb": "where",
            "args": [],
            "caller_id": user_id
        }),
        6,
    )
    .await?;

    assert!(response["result"].is_object());
    let result = &response["result"];
    assert_eq!(result["type"], "where");
    assert!(result["path"].as_str().unwrap().ends_with("subdir"));
    println!("✓ Where verb test passed");

    // Cleanup
    server_handle.abort();
    std::fs::remove_dir_all(&test_dir)?;

    println!("\n✅ All integration tests passed!");
    Ok(())
}
