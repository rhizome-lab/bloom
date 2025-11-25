import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db";
import { seed } from "./seed";
import { getEntity, getContents } from "./repo";

seed();

const wss = new WebSocketServer({ port: 8080 });

console.log("Viwo Core Server running on port 8080");

interface Client extends WebSocket {
  playerId?: number;
}

wss.on("connection", (ws: Client) => {
  console.log("New client connected");

  // Auto-login as the Guest player for now
  const guest = db
    .query("SELECT id FROM entities WHERE name = 'Guest'")
    .get() as { id: number };
  if (guest) {
    ws.playerId = guest.id;
    ws.send(
      JSON.stringify({
        type: "message",
        text: `Welcome to Viwo! You are logged in as Guest (ID: ${guest.id}).`,
      }),
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "error",
        text: "Error: Guest player not found. Please re-seed.",
      }),
    );
  }

  ws.on("message", (message) => {
    let data: unknown;
    try {
      data = JSON.parse(message.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", text: "Invalid JSON." }));
      return;
    }

    if (!Array.isArray(data) || typeof data[0] !== "string") {
      ws.send(
        JSON.stringify({ type: "error", text: "Invalid S-expression format." }),
      );
      return;
    }

    const [command, ...args] = data as [string, ...any[]];
    console.log(
      `[Player ${ws.playerId}] Command: ${command}, Args: ${JSON.stringify(
        args,
      )}`,
    );

    if (!ws.playerId) return;

    const player = getEntity(ws.playerId);
    if (!player) return;

    if (command === "look") {
      // Look at specific target
      if (args.length > 0) {
        const targetName = args[0].toString().toLowerCase();

        // Helper to recursively find an item by name
        const findRecursive = (
          containerId: number,
          name: string,
        ): { id: number; name: string; kind: string; props: any } | null => {
          const contents = getContents(containerId);
          for (const item of contents) {
            if (item.name.toLowerCase() === name) return item;
            const found = findRecursive(item.id, name);
            if (found) return found;
          }
          return null;
        };

        let target = null;

        // Search in room hierarchy
        if (player.location_id) {
          target = findRecursive(player.location_id, targetName);
        }

        // Search in inventory hierarchy if not found
        if (!target) {
          target = findRecursive(player.id, targetName);
        }

        if (!target) {
          ws.send(
            JSON.stringify({
              type: "message",
              text: `You don't see '${args[0]}' here.`,
            }),
          );
          return;
        }

        const richContents = getContents(target.id).map((sub) => ({
          id: sub.id,
          name: sub.name,
          kind: sub.kind,
          contents: [], // Recurse if needed, but keeping it simple
          location_detail: sub.location_detail,
        }));

        ws.send(
          JSON.stringify({
            type: "item", // New type for inspected item
            name: target.name,
            description: target.props["description"] || "It's just a thing.",
            contents: richContents,
          }),
        );
        return;
      }

      // Look at room (existing logic)
      if (!player.location_id) {
        ws.send(
          JSON.stringify({ type: "message", text: "You are in the void." }),
        );
        return;
      }

      const room = getEntity(player.location_id);
      if (!room) {
        ws.send(JSON.stringify({ type: "message", text: "Unknown location." }));
        return;
      }

      const contents = getContents(room.id).filter((e) => e.id !== player.id);

      const richContents = contents.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        location_detail: item.location_detail,
        contents: getContents(item.id).map((sub) => ({
          id: sub.id,
          name: sub.name,
          kind: sub.kind,
          contents: [],
        })),
      }));

      ws.send(
        JSON.stringify({
          type: "room",
          name: room.name,
          description: room.props["description"] || "Nothing special.",
          contents: richContents,
        }),
      );
    } else if (command === "inventory") {
      const items = getContents(player.id);
      const richItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        location_detail: item.location_detail,
        contents: getContents(item.id).map((sub) => ({
          id: sub.id,
          name: sub.name,
          kind: sub.kind,
          contents: [],
        })),
      }));

      ws.send(
        JSON.stringify({
          type: "inventory",
          items: richItems,
        }),
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "message",
          text: `Unknown command: ${command}`,
        }),
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Keep the process alive
process.on("SIGINT", () => {
  console.log("Shutting down...");
  db.close();
  process.exit(0);
});
