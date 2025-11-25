import { WebSocketServer } from "ws";
import { db } from "./db";

const wss = new WebSocketServer({ port: 8080 });

console.log("Viwo Core Server running on port 8080");

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    console.log("Received:", message.toString());
    ws.send(`Echo: ${message}`);
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
