import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
  console.log("Connected to server");
  // Wait for welcome message
  setTimeout(() => {
    console.log("Sending 'look'...");
    ws.send("look");
  }, 500);

  setTimeout(() => {
    console.log("Sending 'inventory'...");
    ws.send("inventory");
  }, 1000);

  setTimeout(() => {
    ws.close();
  }, 1500);
});

ws.on("message", (data) => {
  console.log("Received:", data.toString());
});

ws.on("close", () => {
  console.log("Disconnected");
});
