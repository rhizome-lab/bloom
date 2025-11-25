import { createSignal, onCleanup, onMount } from "solid-js";

function App() {
  const [messages, setMessages] = createSignal<string[]>([]);
  const [input, setInput] = createSignal("");
  let ws: WebSocket;

  onMount(() => {
    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      setMessages((prev) => [...prev, "Connected to server"]);
    };

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, `Server: ${event.data}`]);
    };

    ws.onclose = () => {
      setMessages((prev) => [...prev, "Disconnected from server"]);
    };
  });

  onCleanup(() => {
    if (ws) ws.close();
  });

  const sendMessage = (e: Event) => {
    e.preventDefault();
    if (input() && ws) {
      ws.send(input());
      setMessages((prev) => [...prev, `You: ${input()}`]);
      setInput("");
    }
  };

  return (
    <div style={{ padding: "20px", "font-family": "sans-serif" }}>
      <h1>Viwo Client</h1>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          "overflow-y": "scroll",
          "margin-bottom": "10px",
        }}
      >
        {messages().map((msg) => (
          <div>{msg}</div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          style={{ width: "80%", padding: "5px" }}
          placeholder="Type a message..."
        />
        <button
          type="submit"
          style={{ padding: "5px 10px", "margin-left": "5px" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default App;
