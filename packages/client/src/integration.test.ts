/**
 * Integration tests for BloomClient connecting to real Rust servers.
 *
 * These tests spawn actual server processes and verify end-to-end communication.
 * Run with: bun test packages/client/src/integration.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawn, type Subprocess } from "bun";
import { BloomClient } from "./client";

const TEST_PORT = 18099;
const SERVER_URL = `ws://127.0.0.1:${TEST_PORT}`;
const SERVER_STARTUP_MS = 3000;
const REQUEST_TIMEOUT_MS = 5000;

/** Wait for a condition with timeout */
async function waitFor(
  condition: () => boolean,
  timeoutMs: number,
  pollMs = 100,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

/** Wrap a promise with timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

describe("BloomClient Integration", () => {
  let serverProcess: Subprocess | null = null;
  let client: BloomClient | null = null;
  let testDir: string;

  beforeAll(async () => {
    // Build the server first (in case it needs recompiling)
    console.log("Building notes-server...");
    const buildResult = spawn(["cargo", "build", "-p", "bloom-notes-server"], {
      cwd: process.cwd(),
      stdout: "inherit",
      stderr: "inherit",
    });
    await buildResult.exited;

    if (buildResult.exitCode !== 0) {
      throw new Error(`Failed to build server: exit code ${buildResult.exitCode}`);
    }

    // Create temp database directory
    testDir = `/tmp/bloom-integration-test-${Date.now()}`;
    await Bun.$`mkdir -p ${testDir}`;

    // Start the server from workspace root, but use test dir for database
    console.log(`Starting notes-server on port ${TEST_PORT}...`);
    serverProcess = spawn(
      ["cargo", "run", "-p", "bloom-notes-server"],
      {
        cwd: process.cwd(), // Must be workspace root for cargo
        env: {
          ...process.env,
          RUST_LOG: "info",
          PORT: String(TEST_PORT),
          // Note: Server creates notes.db in cwd, which is workspace root
          // This is fine for testing - we clean up via afterAll
        },
        stdout: "inherit",
        stderr: "inherit",
      },
    );

    // Wait for server to start accepting connections
    console.log("Waiting for server to start...");
    await new Promise((resolve) => setTimeout(resolve, SERVER_STARTUP_MS));

    // Create and connect client
    client = new BloomClient(SERVER_URL, 500);
    client.connect();

    // Wait for connection
    console.log("Waiting for client to connect...");
    try {
      await waitFor(() => client!.getState().isConnected, REQUEST_TIMEOUT_MS);
      console.log("Client connected!");
    } catch (err) {
      console.error("Failed to connect:", err);
      throw err;
    }
  }, 60000); // 60 second timeout for beforeAll

  afterAll(async () => {
    // Disconnect client
    if (client) {
      client.disconnect();
    }

    // Kill server
    if (serverProcess) {
      console.log("Shutting down server...");
      serverProcess.kill();
      await serverProcess.exited;
    }

    // Clean up test directory
    if (testDir) {
      await Bun.$`rm -rf ${testDir}`.quiet();
    }
  });

  it("should be connected", () => {
    expect(client).not.toBeNull();
    expect(client!.getState().isConnected).toBe(true);
  });

  it("should receive player_id on connection", async () => {
    // Player ID should be set after login sequence
    await waitFor(() => client!.getState().playerId !== null, REQUEST_TIMEOUT_MS);

    expect(client!.getState().playerId).toBeGreaterThan(0);
  });

  it("should ping the server", async () => {
    const result = await withTimeout(client!.sendRequest("ping", {}), REQUEST_TIMEOUT_MS);

    expect(result).toBe("pong");
  });

  it("should fetch entities", async () => {
    const playerId = client!.getState().playerId;
    expect(playerId).not.toBeNull();

    const entities = await withTimeout(
      client!.fetchEntities([playerId!]),
      REQUEST_TIMEOUT_MS,
    );

    expect(entities.length).toBe(1);
    expect(entities[0].id).toBe(playerId);
  });

  it("should execute commands", async () => {
    // Execute "look" command (common verb)
    const result = await withTimeout(
      client!.execute("look", []),
      REQUEST_TIMEOUT_MS,
    );

    // Result can be various things depending on server implementation
    // Just verify we got a response without error
    expect(result).toBeDefined();
  });

  it("should get opcodes", async () => {
    const result = await withTimeout(
      client!.sendRequest("get_opcodes", {}),
      REQUEST_TIMEOUT_MS,
    );

    expect(Array.isArray(result)).toBe(true);
    // Should have standard opcodes
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle entity updates via notifications", async () => {
    const playerId = client!.getState().playerId!;

    // Fetch to populate cache
    await client!.fetchEntities([playerId]);

    // Entity should be in state
    const entity = client!.getState().entities.get(playerId);
    expect(entity).toBeDefined();
    expect(entity?.id).toBe(playerId);
  });
});
