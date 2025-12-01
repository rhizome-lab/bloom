import { createStore } from "solid-js/store";
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

export type { Entity } from "@viwo/shared/jsonrpc";

export type CommandArgument =
  | string
  | number
  | boolean
  | null
  | readonly CommandArgument[];

export type GameMessage =
  | { type: "message"; text: string }
  | { type: "error"; text: string };

interface GameState {
  responseResolveFunctions: Map<number, (value: any) => void>;
  isConnected: boolean;
  messages: GameMessage[];
  entities: Map<number, Entity>;
  roomId: number | null;
  playerId: number | null;
  inspectedItem: number | null;
  opcodes: any[] | null;
  socket: WebSocket | null;
}

const [state, setState] = createStore<GameState>({
  responseResolveFunctions: new Map(),
  isConnected: false,
  messages: [],
  entities: new Map(),
  roomId: null,
  playerId: null,
  inspectedItem: null,
  opcodes: null,
  socket: null,
});

let idCounter = 1;

export const gameStore = {
  state,

  connect: () => {
    if (state.isConnected) return;

    const socket = new WebSocket("ws://localhost:8080");
    setState("socket", socket);

    socket.onopen = () => {
      setState("isConnected", true);
      // Initial fetch
      gameStore.execute(["whoami"]);
      gameStore.execute(["look"]);
      gameStore.execute(["inventory"]);

      // Fetch opcodes
      const req: JsonRpcRequest = {
        jsonrpc: "2.0",
        method: "get_opcodes",
        id: 0, // Static ID for now
        params: [],
      };
      socket.send(JSON.stringify(req));
    };

    socket.onclose = () => {
      setState("isConnected", false);
      gameStore.addMessage({
        type: "error",
        text: "Disconnected from server.",
      });
      setState("socket", null);
    };

    const handleNotification = (notification: JsonRpcNotification) => {
      switch (notification.method) {
        case "message": {
          const params = (notification as MessageNotification).params;
          gameStore.addMessage({
            type: params.type === "info" ? "message" : "error",
            text: params.text,
          });
          break;
        }
        case "update": {
          const params = (notification as UpdateNotification).params;
          const newEntities = new Map(state.entities);
          for (const entity of params.entities) {
            newEntities.set(entity.id, entity);
          }
          setState("entities", newEntities);
          break;
        }
        case "room_id": {
          const params = (notification as RoomIdNotification).params;
          setState("roomId", params.roomId);
          break;
        }
        case "player_id": {
          const params = (notification as PlayerIdNotification).params;
          setState("playerId", params.playerId);
          break;
        }
        default:
          console.warn("Unknown notification method:", notification.method);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Basic JSON-RPC validation
        if (data.jsonrpc !== "2.0") {
          console.warn("Invalid JSON-RPC version", data);
          return;
        }

        if ("id" in data && data.id !== null && data.id !== undefined) {
          // It's a response
          const response = data as JsonRpcResponse;
          const resolve = state.responseResolveFunctions.get(
            Number(response.id),
          );
          if (resolve) {
            if ("result" in response) {
              resolve(response.result);

              // Special handling for get_opcodes response
              // We might need a better way to identify this request
              if (response.id === 0) {
                setState("opcodes", response.result);
              }
            } else {
              console.error("RPC Error:", response.error);
              gameStore.addMessage({
                type: "error",
                text: `Error: ${response.error.message}`,
              });
              resolve(null); // Resolve with null on error?
            }
            state.responseResolveFunctions.delete(Number(response.id));
          }
        } else if ("method" in data) {
          // It's a notification
          handleNotification(data as JsonRpcNotification);
        }
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };
  },

  execute: (
    command: readonly [command: string, ...args: CommandArgument[]],
  ) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      const id = idCounter;
      idCounter += 1;

      const req: JsonRpcRequest = {
        jsonrpc: "2.0",
        method: "execute",
        params: command,
        id,
      };

      state.socket.send(JSON.stringify(req));
      return new Promise((resolve) => {
        state.responseResolveFunctions.set(id, resolve);
      });
    } else {
      throw new Error("Socket not connected");
    }
  },

  lookAt: (item: number | string) => gameStore.execute(["look", item]),

  addMessage: (msg: GameMessage) => {
    setState("messages", (msgs) => [...msgs, msg]);
  },
};
