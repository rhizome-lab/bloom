import { useState, useEffect, useRef } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import WebSocket from "ws";
import TextInput from "ink-text-input";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  MessageNotification,
  UpdateNotification,
  RoomIdNotification,
  PlayerIdNotification,
  Entity,
} from "@viwo/shared/jsonrpc";

// Types
type LogEntry = {
  id: string;
  message: string | object;
  type: "info" | "error" | "other";
};

const App = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [rows, setRows] = useState(stdout.rows || 24);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [room, setRoom] = useState<Entity | null>(null);
  const [inventory, setInventory] = useState<Entity[]>([]);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [entities, setEntities] = useState<Map<number, Entity>>(new Map());
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const onResize = () => setRows(stdout.rows || 24);
    stdout.on?.("resize", onResize);
    return () => {
      stdout.off?.("resize", onResize);
    };
  }, [stdout]);

  useEffect(() => {
    // Update room and inventory based on entities and IDs
    if (roomId && entities.has(roomId)) {
      setRoom(entities.get(roomId)!);
    }
    if (playerId && entities.has(playerId)) {
      const player = entities.get(playerId);
      const contents = player?.contents as number[] | undefined;
      if (contents && Array.isArray(contents)) {
        const items = contents
          .map((id) => entities.get(id))
          .filter((e): e is Entity => !!e);
        setInventory(items);
      }
    }
  }, [entities, roomId, playerId]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    ws.current = socket;

    socket.on("open", () => {
      setConnected(true);
      sendRequest("get_opcodes", []);
      sendRequest("whoami", []);
      sendRequest("look", []);
      sendRequest("inventory", []);
    });

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(message);
      } catch {
        addLog("Error parsing message.", "error");
      }
    });

    socket.on("close", () => {
      setConnected(false);
      addLog("Disconnected from server.", "error");
      // exit(); // Optional: exit on disconnect
    });

    socket.on("error", (err) => {
      addLog(`WebSocket error: ${err.message}`, "error");
    });

    return () => {
      socket.close();
    };
  }, []);

  const sendRequest = (method: string, params: any[]) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const req: JsonRpcRequest = {
        jsonrpc: "2.0",
        method: "execute",
        params: method === "execute" ? params : [method, ...params], // Wrapper for execute command
        id: Date.now(),
      };
      // Special case for get_opcodes which is a direct method
      if (method === "get_opcodes") {
        req.method = "get_opcodes";
        req.params = [];
      }

      ws.current.send(JSON.stringify(req));
    }
  };

  const addLog = (
    message: string | object,
    type: "info" | "error" | "other" = "info",
  ) => {
    setLogs((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), message, type },
    ]);
  };

  const handleMessage = (data: any) => {
    // Basic JSON-RPC validation
    if (data.jsonrpc !== "2.0") return;

    if ("method" in data) {
      // Notification
      const notification = data as JsonRpcNotification;
      switch (notification.method) {
        case "message": {
          const params = (notification as MessageNotification).params;
          addLog(params.text, params.type === "info" ? "info" : "error");
          break;
        }
        case "update": {
          const params = (notification as UpdateNotification).params;
          setEntities((prev) => {
            const next = new Map(prev);
            for (const entity of params.entities) {
              next.set(entity.id, entity);
            }
            return next;
          });
          break;
        }
        case "room_id": {
          const params = (notification as RoomIdNotification).params;
          setRoomId(params.roomId);
          break;
        }
        case "player_id": {
          const params = (notification as PlayerIdNotification).params;
          setPlayerId(params.playerId);
          break;
        }
      }
    } else if ("id" in data) {
      // Response
      const response = data as JsonRpcResponse;
      if ("error" in response) {
        addLog(`Error: ${response.error.message}`, "error");
      } else {
        // Success response, maybe log it or handle specific IDs
        // addLog(`Result: ${JSON.stringify(response.result)}`, "other");
      }
    }
  };

  const handleSubmit = (input: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      addLog("Not connected.", "error");
      return;
    }

    if (input.trim() === "exit" || input.trim() === "quit") {
      exit();
      return;
    }

    // Echo command
    addLog(`> ${input}`, "other");

    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (parts) {
      const command = parts[0];
      const args = parts.slice(1).map((arg) => arg.replace(/^"(.*)"$/, "$1"));
      sendRequest(command, args);
    }
    setQuery("");
  };

  // Helper to get room contents
  const getRoomContents = () => {
    if (!room || !room.contents || !Array.isArray(room.contents)) return [];
    return room.contents
      .map((id: number) => entities.get(id))
      .filter((e: Entity | undefined): e is Entity => !!e);
  };

  return (
    <Box flexDirection="column" height={rows}>
      {/* Header */}
      <Box borderStyle="single" borderColor="green">
        <Text bold color="green">
          {" "}
          Viwo TUI{" "}
        </Text>
        <Text> | </Text>
        <Text color={connected ? "green" : "red"}>
          {" "}
          {connected ? "ONLINE" : "OFFLINE"}{" "}
        </Text>
      </Box>

      {/* Main Content Area */}
      <Box flexGrow={1}>
        {/* Left Column: Log */}
        <Box width="30%" borderStyle="single" flexDirection="column">
          <Text bold underline>
            Log
          </Text>
          <Box flexDirection="column" flexGrow={1} overflowY="hidden">
            {logs.slice(-20).map((log) => (
              <Box key={log.id}>
                <Text
                  color={
                    log.type === "error"
                      ? "red"
                      : log.type === "info"
                      ? "white"
                      : "blue"
                  }
                >
                  {typeof log.message === "string"
                    ? log.message
                    : JSON.stringify(log.message)}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Center Column: Room */}
        <Box width="40%" borderStyle="single" flexDirection="column">
          <Text bold underline>
            Current Room
          </Text>
          {room ? (
            <>
              <Text bold color="cyan">
                {room.name as string}
              </Text>
              <Text italic>{room.description as string}</Text>
              <Box marginTop={1}>
                <Text underline>Contents:</Text>
                {getRoomContents().map((item: Entity, idx: number) => (
                  <Text key={idx}>
                    - {item.name as string} ({item.kind as string})
                  </Text>
                ))}
              </Box>
            </>
          ) : (
            <Text>No room data.</Text>
          )}
        </Box>

        {/* Right Column: Inventory */}
        <Box width="30%" borderStyle="single" flexDirection="column">
          <Text bold underline>
            Inventory
          </Text>
          {inventory.length > 0 ? (
            inventory.map((item, idx) => (
              <Text key={idx}>- {item.name as string}</Text>
            ))
          ) : (
            <Text color="gray">(empty)</Text>
          )}
        </Box>
      </Box>

      {/* Input Bar */}
      <Box borderStyle="single" borderColor="blue">
        <Text color="green">&gt; </Text>
        <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
};

export default App;
