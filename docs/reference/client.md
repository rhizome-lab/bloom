# Client SDK

The Client SDK (`@bloom/client`) provides a type-safe interface for connecting to the Bloom Core server via WebSockets. It handles the JSON-RPC protocol, state management, and event subscriptions.

## Installation

```bash
bun add @bloom/client
```

## Usage

### Connecting to the Server

```typescript
import { BloomClient, GameState } from "@bloom/client";

const client = new BloomClient("ws://localhost:8080");

// Subscribe to state changes
client.subscribe((state: GameState) => {
  if (state.isConnected) {
    console.log("Connected!");
  }
});

// Connect
client.connect();
```

### Executing Commands

To send a command to the server (e.g., "look", "go north"):

```typescript
client.execute("look");
client.execute("go", ["north"]);
```

### Handling Messages

To receive game messages (e.g., descriptions, chat):

```typescript
import { GameMessage } from "@bloom/client";

client.onMessage((msg: GameMessage) => {
  console.log(`[${msg.type}] ${msg.text}`);
});
```

## API Reference

### `BloomClient`

#### `constructor(url: string)`

Creates a new client instance.

#### `connect()`

Initiates the WebSocket connection.

#### `execute(command: string, args?: string[])`

Sends a command to the server.

#### `subscribe(callback: (state: GameState) => void)`

Subscribes to state changes (connection status, current room, etc.).

#### `onMessage(callback: (msg: GameMessage) => void)`

Registers a callback for incoming game messages.
