import { createSignal, onMount } from "solid-js";
import { ScriptEditor } from "@viwo/web-editor";
import { useViwoConnection } from "../utils/viwo-connection";

function BlocksMode() {
  const [script, setScript] = createSignal(["seq"]);
  const { capabilities, connected, sendRpc } = useViwoConnection();
  const [coreOpcodes, setCoreOpcodes] = createSignal<any[]>([]);

  onMount(async () => {
    // Fetch core opcodes from server
    if (connected()) {
      try {
        const opcodeMetadata = await sendRpc("get_opcodes", {});
        setCoreOpcodes(opcodeMetadata);
      } catch (error) {
        console.error("Failed to fetch core opcodes:", error);
      }
    }
  });

  // Merge core opcodes with capability-based blocks
  const opcodes = () => {
    const blocks: any[] = [...coreOpcodes()];

    // Add capability-based blocks
    for (const cap of capabilities()) {
      for (const method of cap.methods) {
        blocks.push({
          category: cap.label,
          label: method.label,
          opcode: `${cap.type}.${method.name}`,
          slots: method.parameters.map((parameter: any) => ({
            default: parameter.default,
            name: parameter.name,
            type: parameter.type === "object" ? "block" : parameter.type,
          })),
        });
      }
    }

    return blocks;
  };

  return (
    <div class="blocks-mode">
      {!connected() ? (
        <div style={{ padding: "20px", "text-align": "center" }}>Connecting to viwo server...</div>
      ) : (
        <ScriptEditor opcodes={opcodes()} value={script()} onChange={setScript} />
      )}
    </div>
  );
}

export default BlocksMode;
