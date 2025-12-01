import WebSocket from "ws";
import minimist from "minimist";
import chalk from "chalk";
import readline from "readline";
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

const args = minimist(process.argv.slice(2));

// Determine color mode
let useColor = true; // Default to on

if (args.color === "off" || args.color === false) {
  useColor = false;
}

// If useColor is false, disable chalk
if (!useColor) {
  chalk.level = 0;
}

const ws = new WebSocket("ws://localhost:8080");

// State
let entities = new Map<number, Entity>();
let _roomId: number | null = null;
let _playerId: number | null = null;

ws.on("open", () => {
  console.log(chalk.green("Connected to Viwo Core."));
  sendRequest("get_opcodes", []);
  sendRequest("whoami", []);
  sendRequest("look", []);
  sendRequest("inventory", []);
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data.toString());
    handleMessage(message);
  } catch {
    console.log(
      chalk.red("Error parsing message from server:"),
      data.toString(),
    );
  }
});

ws.on("close", () => {
  console.log(chalk.yellow("Disconnected from server."));
  process.exit(0);
});

ws.on("error", (err) => {
  console.error(chalk.red("WebSocket error:"), err.message);
  process.exit(1);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

rl.prompt();

import { parseCommand } from "./parser";

rl.on("line", (line) => {
  const result = parseCommand(line);
  if (result) {
    sendRequest(result.command, result.args);
  }
  rl.prompt();
});

rl.on("close", () => {
  console.log("Exiting...");
  process.exit(0);
});

function sendRequest(method: string, params: any[]) {
  if (ws.readyState === WebSocket.OPEN) {
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "execute",
      params: method === "execute" ? params : [method, ...params],
      id: Date.now(),
    };
    // Special case for get_opcodes
    if (method === "get_opcodes") {
      req.method = "get_opcodes";
      req.params = [];
    }
    ws.send(JSON.stringify(req));
  }
}

function handleMessage(data: any) {
  // Basic JSON-RPC validation
  if (data.jsonrpc !== "2.0") return;

  if ("method" in data) {
    // Notification
    const notification = data as JsonRpcNotification;
    switch (notification.method) {
      case "message": {
        const params = (notification as MessageNotification).params;
        if (params.type === "error") {
          console.log(chalk.red(params.text));
        } else {
          console.log(chalk.blue(params.text));
        }
        break;
      }
      case "update": {
        const params = (notification as UpdateNotification).params;
        for (const entity of params.entities) {
          entities.set(entity.id, entity);
        }
        // After update, if we have room info, display it
        // This is a bit spammy, maybe we should only display if something relevant changed?
        // For now, let's just rely on explicit look commands or specific messages
        break;
      }
      case "room_id": {
        const params = (notification as RoomIdNotification).params;
        _roomId = params.roomId;
        break;
      }
      case "player_id": {
        const params = (notification as PlayerIdNotification).params;
        _playerId = params.playerId;
        break;
      }
    }
  } else if ("id" in data) {
    // Response
    const response = data as JsonRpcResponse;
    if ("error" in response) {
      console.log(chalk.red(response.error.message));
    } else {
      // Success
    }
  }
  rl.prompt();
}
