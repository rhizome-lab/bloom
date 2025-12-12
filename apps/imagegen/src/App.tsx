import BlocksMode from "./modes/BlocksMode";
import LayerMode from "./modes/LayerMode";
import { createSignal } from "solid-js";

type Mode = "layer" | "blocks";

function App() {
  const [mode, setMode] = createSignal<Mode>("layer");

  return (
    <div class="imagegen">
      <header class="imagegen__header">
        <div class="imagegen__title">Viwo Image Generation</div>
        <div class="imagegen__mode-toggle">
          <button
            class={`imagegen__mode-btn ${mode() === "layer" ? "imagegen__mode-btn--active" : ""}`}
            onClick={() => setMode("layer")}
          >
            Layer Mode
          </button>
          <button
            class={`imagegen__mode-btn ${mode() === "blocks" ? "imagegen__mode-btn--active" : ""}`}
            onClick={() => setMode("blocks")}
          >
            Blocks Mode
          </button>
        </div>
      </header>

      <main class="imagegen__main">{mode() === "layer" ? <LayerMode /> : <BlocksMode />}</main>
    </div>
  );
}

export default App;
