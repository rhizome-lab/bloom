// oxlint-disable prefer-add-event-listener
import { createEffect, createSignal, onCleanup } from "solid-js";

export interface CapabilityMetadata {
  type: string;
  label: string;
  description: string;
  methods: {
    name: string;
    label: string;
    description: string;
    parameters: any[];
    returnType: string;
  }[];
}

let ws: WebSocket | null = null;
let messageId = 0;
const pendingRequests = new Map<number, (result: any) => void>();

export function useViwoConnection() {
  const [connected, setConnected] = createSignal(false);
  const [capabilities, setCapabilities] = createSignal<CapabilityMetadata[]>([]);

  createEffect(() => {
    // Connect to viwo server
    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("Connected to viwo server");
      setConnected(true);

      // Fetch capability metadata
      sendRpc("get_capability_metadata", {}).then((metadata) => {
        console.log("Received capability metadata:", metadata);
        setCapabilities(metadata);
      });
    };

    ws.onclose = () => {
      console.log("Disconnected from viwo server");
      setConnected(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle RPC responses
      if ("result" in data && "id" in data) {
        const callback = pendingRequests.get(data.id);
        if (callback) {
          callback(data.result);
          pendingRequests.delete(data.id);
        }
      }

      // Handle notifications (if needed later)
      if ("method" in data && !("id" in data)) {
        console.log("Received notification:", data.method, data.params);
      }
    };

    onCleanup(() => {
      ws?.close();
      ws = null;
    });
  });

  return {
    capabilities,
    connected,
    sendRpc,
  };
}

function sendRpc(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected"));
      return;
    }

    messageId += 1;
    const id = messageId;
    pendingRequests.set(id, resolve);

    ws.send(
      JSON.stringify({
        id,
        jsonrpc: "2.0",
        method,
        params,
      }),
    );

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("Request timeout"));
      }
    }, 30_000);
  });
}
