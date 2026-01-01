import { type FileEntry, browserStore } from "./store/browser";
import { For, Show, onMount } from "solid-js";

function formatSize(bytes?: number): string {
  if (bytes === undefined) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Breadcrumb() {
  const segments = () => {
    const { cwd } = browserStore.state;
    if (!cwd || cwd === "/") {
      return ["/"];
    }
    const parts = cwd.split("/").filter(Boolean);
    return ["/", ...parts];
  };

  const navigateToSegment = (idx: number) => {
    const segs = segments();
    if (idx === 0) {
      browserStore.go("/");
    } else {
      const path = `/${segs.slice(1, idx + 1).join("/")}`;
      browserStore.go(path);
    }
  };

  return (
    <div class="fb-breadcrumb">
      <For each={segments()}>
        {(segment, idx) => (
          <>
            <span class="fb-breadcrumb__segment" onClick={() => navigateToSegment(idx())}>
              {segment}
            </span>
            <Show when={idx() < segments().length - 1}>
              <span class="fb-breadcrumb__separator">/</span>
            </Show>
          </>
        )}
      </For>
    </div>
  );
}

function FileList() {
  const handleClick = (entry: FileEntry) => {
    browserStore.open(entry.name);
  };

  return (
    <div class="fb-list">
      <Show when={browserStore.state.cwd !== "/"}>
        <div class="fb-entry fb-entry--dir" onClick={() => browserStore.back()}>
          <span class="fb-entry__icon">..</span>
          <span class="fb-entry__name">(parent)</span>
        </div>
      </Show>
      <For each={browserStore.state.entries}>
        {(entry) => (
          <div
            class={`fb-entry ${entry.isDirectory ? "fb-entry--dir" : ""}`}
            onClick={() => handleClick(entry)}
          >
            <span class="fb-entry__icon">{entry.isDirectory ? "📁" : "📄"}</span>
            <span class="fb-entry__name">{entry.name}</span>
            <span class="fb-entry__size">{formatSize(entry.size)}</span>
          </div>
        )}
      </For>
    </div>
  );
}

function Preview() {
  const preview = () => browserStore.state.preview;

  return (
    <div class="fb-preview">
      <Show when={preview()} fallback={<div class="fb-preview__empty">Select a file to preview</div>}>
        <div class="fb-preview__header">
          <span class="fb-preview__name">{preview()!.name}</span>
          <span class="fb-preview__size">{formatSize(preview()!.size)}</span>
          <button class="fb-preview__close" onClick={() => browserStore.closePreview()}>
            ×
          </button>
        </div>
        <pre class="fb-preview__content">{preview()!.content}</pre>
      </Show>
    </div>
  );
}

function App() {
  onMount(() => {
    browserStore.connect();
    // Wait for connection then fetch initial directory listing
    const checkConnection = setInterval(() => {
      if (browserStore.state.connected) {
        clearInterval(checkConnection);
        browserStore.look();
      }
    }, 100);
  });

  return (
    <div class="fb">
      <header class="fb__header">
        <div class="fb__title">Viwo File Browser</div>
        <div class={`fb__status ${browserStore.state.connected ? "fb__status--online" : ""}`}>
          {browserStore.state.connected ? "ONLINE" : "OFFLINE"}
        </div>
      </header>

      <Show when={browserStore.state.error}>
        <div class="fb__error">{browserStore.state.error}</div>
      </Show>

      <div class="fb__main">
        <div class="fb__sidebar">
          <Breadcrumb />
          <Show when={browserStore.state.loading}>
            <div class="fb__loading">Loading...</div>
          </Show>
          <FileList />
        </div>
        <Preview />
      </div>
    </div>
  );
}

export default App;
