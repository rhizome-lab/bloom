//! WebSocket server implementation.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};

use crate::session::{Session, SessionId};
use viwo_runtime::ViwoRuntime;

/// Server configuration.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub db_path: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            db_path: "world.sqlite".to_string(),
        }
    }
}

/// The Viwo WebSocket server.
pub struct Server {
    config: ServerConfig,
    runtime: Arc<ViwoRuntime>,
    sessions: Arc<RwLock<HashMap<SessionId, Session>>>,
    broadcast_tx: broadcast::Sender<String>,
}

impl Server {
    /// Create a new server with the given runtime and configuration.
    pub fn new(runtime: Arc<ViwoRuntime>, config: ServerConfig) -> Self {
        let (broadcast_tx, _) = broadcast::channel(256);

        Self {
            config,
            runtime,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            broadcast_tx,
        }
    }

    /// Get the runtime.
    pub fn runtime(&self) -> &Arc<ViwoRuntime> {
        &self.runtime
    }

    /// Run the server, accepting connections until shutdown.
    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        let addr = format!("{}:{}", self.config.host, self.config.port);
        let listener = TcpListener::bind(&addr).await?;
        info!("Listening on ws://{}", addr);

        while let Ok((stream, addr)) = listener.accept().await {
            let runtime = Arc::clone(&self.runtime);
            let sessions = Arc::clone(&self.sessions);
            let broadcast_tx = self.broadcast_tx.clone();

            tokio::spawn(async move {
                if let Err(err) = handle_connection(stream, addr, runtime, sessions, broadcast_tx).await {
                    error!("Connection error from {}: {}", addr, err);
                }
            });
        }

        Ok(())
    }
}

/// Handle a single WebSocket connection.
async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    runtime: Arc<ViwoRuntime>,
    sessions: Arc<RwLock<HashMap<SessionId, Session>>>,
    broadcast_tx: broadcast::Sender<String>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws_stream = tokio_tungstenite::accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    info!("New connection from {}", addr);

    // Create session
    let session_id = SessionId::new();
    let session = Session::new(session_id, addr);

    {
        let mut sessions = sessions.write().await;
        sessions.insert(session_id, session);
    }

    // Subscribe to broadcasts
    let mut broadcast_rx = broadcast_tx.subscribe();

    // Create channel for sending messages to this client
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Spawn task to forward messages to WebSocket
    let sender_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                Some(msg) = rx.recv() => {
                    if let Err(err) = ws_sender.send(Message::Text(msg.into())).await {
                        error!("Failed to send message: {}", err);
                        break;
                    }
                }
                Ok(msg) = broadcast_rx.recv() => {
                    if let Err(err) = ws_sender.send(Message::Text(msg.into())).await {
                        error!("Failed to send broadcast: {}", err);
                        break;
                    }
                }
                else => break,
            }
        }
    });

    // Handle incoming messages
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                match handle_message(text.as_ref(), &runtime, &tx).await {
                    Ok(()) => {}
                    Err(err) => {
                        warn!("Error handling message from {}: {}", addr, err);
                        let error_response = serde_json::json!({
                            "jsonrpc": "2.0",
                            "error": {
                                "code": -32000,
                                "message": err.to_string()
                            },
                            "id": null
                        });
                        let _ = tx.send(error_response.to_string());
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("Client {} disconnected", addr);
                break;
            }
            Ok(Message::Ping(data)) => {
                // Pong is sent automatically by tungstenite
                let _ = data;
            }
            Ok(_) => {} // Ignore other message types
            Err(err) => {
                error!("WebSocket error from {}: {}", addr, err);
                break;
            }
        }
    }

    // Cleanup
    sender_task.abort();
    {
        let mut sessions = sessions.write().await;
        sessions.remove(&session_id);
    }
    info!("Connection closed: {}", addr);

    Ok(())
}

/// Handle a JSON-RPC message.
async fn handle_message(
    text: &str,
    runtime: &Arc<ViwoRuntime>,
    tx: &mpsc::UnboundedSender<String>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let request: serde_json::Value = serde_json::from_str(text)?;

    // Extract JSON-RPC fields
    let method = request.get("method")
        .and_then(|m| m.as_str())
        .ok_or("Missing method")?;
    let params = request.get("params");
    let id = request.get("id");

    // Route to handler
    let result: Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> = match method {
        "ping" => {
            Ok(serde_json::json!("pong"))
        }
        "get_entity" => {
            let entity_id = params
                .and_then(|p| p.get("id"))
                .and_then(|id| id.as_i64())
                .ok_or("Missing entity id")?;

            let storage = runtime.storage().lock().unwrap();
            match storage.get_entity(entity_id) {
                Ok(Some(entity)) => Ok(serde_json::to_value(&entity)?),
                Ok(None) => Err("Entity not found".into()),
                Err(err) => Err(err.to_string().into()),
            }
        }
        "create_entity" => {
            let props = params
                .and_then(|p| p.get("props"))
                .cloned()
                .unwrap_or(serde_json::json!({}));
            let prototype_id = params
                .and_then(|p| p.get("prototype_id"))
                .and_then(|id| id.as_i64());

            let storage = runtime.storage().lock().unwrap();
            match storage.create_entity(props, prototype_id) {
                Ok(id) => Ok(serde_json::json!({ "id": id })),
                Err(err) => Err(err.to_string().into()),
            }
        }
        "call_verb" => {
            let entity_id = params
                .and_then(|p| p.get("entity_id"))
                .and_then(|id| id.as_i64())
                .ok_or("Missing entity_id")?;
            let verb_name = params
                .and_then(|p| p.get("verb"))
                .and_then(|v| v.as_str())
                .ok_or("Missing verb name")?;
            let args = params
                .and_then(|p| p.get("args"))
                .and_then(|a| a.as_array())
                .cloned()
                .unwrap_or_default();
            let caller_id = params
                .and_then(|p| p.get("caller_id"))
                .and_then(|id| id.as_i64());

            match runtime.execute_verb(entity_id, verb_name, args.clone(), caller_id) {
                Ok(result) => Ok(result),
                Err(err) => Err(err.to_string().into()),
            }
        }
        _ => {
            Err(format!("Unknown method: {}", method).into())
        }
    };

    // Build response
    let response: serde_json::Value = match result {
        Ok(result) => {
            serde_json::json!({
                "jsonrpc": "2.0",
                "result": result,
                "id": id
            })
        }
        Err(err) => {
            serde_json::json!({
                "jsonrpc": "2.0",
                "error": {
                    "code": -32000,
                    "message": err.to_string()
                },
                "id": id
            })
        }
    };

    tx.send(response.to_string())?;
    Ok(())
}
