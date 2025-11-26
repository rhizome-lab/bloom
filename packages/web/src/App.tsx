import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { gameStore } from "./store/game";
import { keybindsStore } from "./store/keybinds";
import GameLog from "./components/GameLog";
import Builder from "./components/Builder";
import Compass from "./components/Compass";
import CustomExits from "./components/CustomExits";
import RoomPanel from "./components/RoomPanel";
import InventoryPanel from "./components/InventoryPanel";
import InspectorPanel from "./components/InspectorPanel";
import { SettingsModal } from "./components/SettingsModal";
import "./index.css";

function App() {
  const [showBuilder, setShowBuilder] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in an input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const action = keybindsStore.getActionForKey(e.key);
    if (action) {
      e.preventDefault();
      switch (action) {
        case "north":
          gameStore.send(["move", "north"]);
          break;
        case "south":
          gameStore.send(["move", "south"]);
          break;
        case "east":
          gameStore.send(["move", "east"]);
          break;
        case "west":
          gameStore.send(["move", "west"]);
          break;
        case "look":
          gameStore.send(["look"]);
          break;
        case "inventory":
          gameStore.send(["inventory"]);
          break;
      }
    }
  };

  onMount(() => {
    gameStore.connect();
    window.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div class="app">
      <SettingsModal
        isOpen={showSettings()}
        onClose={() => setShowSettings(false)}
      />

      {/* Header / Status */}
      <div class="app__header">
        <div class="app__title">VIWO</div>
        <div class="app__header-controls">
          <button
            onClick={() => setShowSettings(true)}
            class="app__settings-btn"
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowBuilder(!showBuilder())}
            classList={{
              "app__builder-btn": true,
              "app__builder-btn--active": showBuilder(),
            }}
          >
            Builder Mode
          </button>
          <div
            classList={{
              app__status: true,
              "app__status--online": gameStore.state.isConnected,
            }}
          >
            {gameStore.state.isConnected ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </div>

      {/* Left Sidebar (Log / History - Optional, or maybe Chat?) */}
      <div class="app__sidebar-left">
        <div class="app__sidebar-header">LOG</div>
        <GameLog />
        <CustomExits />
      </div>

      {/* Center (Room View) */}
      <div class="app__main">
        <RoomPanel />
        <Show when={showBuilder()}>
          <div class="app__builder-overlay">
            <Builder />
          </div>
        </Show>
      </div>

      {/* Right Sidebar (Inventory) */}
      <div class="app__sidebar-right">
        <div class="app__sidebar-header">INVENTORY</div>
        <InventoryPanel />
      </div>

      {/* Bottom Panel (Controls & Inspector) */}
      <div class="app__bottom">
        {/* Controls */}
        <div class="app__controls">
          <Compass />
        </div>

        {/* Inspector */}
        <div class="app__inspector">
          <InspectorPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
