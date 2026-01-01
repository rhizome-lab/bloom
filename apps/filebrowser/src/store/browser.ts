import { ViwoClient } from "@viwo/client";
import { createStore } from "solid-js/store";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mtime?: string;
}

interface DirectoryListing {
  type: "directory_listing";
  path: string;
  entries: FileEntry[];
}

interface FileContent {
  type: "file_content";
  path: string;
  name: string;
  content: string;
  size: number;
}

interface BrowserState {
  connected: boolean;
  loading: boolean;
  cwd: string;
  entries: FileEntry[];
  preview: FileContent | null;
  error: string | null;
}

const client = new ViwoClient("ws://localhost:8080");

const [state, setState] = createStore<BrowserState>({
  connected: false,
  cwd: "/",
  entries: [],
  error: null,
  loading: false,
  preview: null,
});

// Sync connection state
client.subscribe((clientState) => {
  setState("connected", clientState.isConnected);
});

async function look(): Promise<void> {
  setState("loading", true);
  setState("error", null);
  try {
    const result = (await client.execute("look", [])) as DirectoryListing;
    if (result && result.type === "directory_listing") {
      setState({
        cwd: result.path,
        entries: result.entries,
        loading: false,
        preview: null,
      });
    }
  } catch (error) {
    setState("error", String(error));
    setState("loading", false);
  }
}

async function go(path: string): Promise<void> {
  setState("loading", true);
  setState("error", null);
  try {
    const result = (await client.execute("go", [path])) as DirectoryListing;
    if (result && result.type === "directory_listing") {
      setState({
        cwd: result.path,
        entries: result.entries,
        loading: false,
        preview: null,
      });
    }
  } catch (error) {
    setState("error", String(error));
    setState("loading", false);
  }
}

async function open(name: string): Promise<void> {
  setState("loading", true);
  setState("error", null);
  try {
    const result = (await client.execute("open", [name])) as DirectoryListing | FileContent;
    if (result && result.type === "directory_listing") {
      setState({
        cwd: result.path,
        entries: result.entries,
        loading: false,
        preview: null,
      });
    } else if (result && result.type === "file_content") {
      setState({
        loading: false,
        preview: result,
      });
    }
  } catch (error) {
    setState("error", String(error));
    setState("loading", false);
  }
}

function back(): Promise<void> {
  return go("..");
}

function connect(): void {
  client.connect();
}

function closePreview(): void {
  setState("preview", null);
}

export const browserStore = {
  back,
  closePreview,
  connect,
  go,
  look,
  open,
  state,
};
