import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { fsWrite, fsList } from "./fs";
import { createCapability } from "../../repo";
import { db } from "../../db";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createScriptContext } from "@viwo/scripting";

// Mock context
const mockCtx = createScriptContext({ this: { id: 1 }, caller: { id: 1 } });

describe("FS Library", () => {
  const testDir = path.resolve("./tmp_test_fs");
  let capId: string;
  let cap: any;

  beforeAll(async () => {
    // Setup DB
    db.query(
      "CREATE TABLE IF NOT EXISTS capabilities (id TEXT PRIMARY KEY, owner_id INTEGER, type TEXT, params TEXT)",
    ).run();

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create capability
    capId = createCapability(1, "fs.write", { path: testDir });
    // We need to fetch it back to get the object structure expected by the opcode
    // But for the test we can just construct a mock capability object that matches the interface
    // and what checkCapability expects.
    // However, checkCapability queries the DB? No, it takes a Capability object.
    // The Capability object has params.

    cap = {
      id: capId,
      owner_id: 1,
      type: "fs.write",
      params: { path: testDir },
      __brand: "Capability",
    };
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should write to a file", async () => {
    const filePath = path.join(testDir, "test.txt");
    await fsWrite.handler([cap, filePath, "Hello World"], mockCtx);

    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("Hello World");
  });

  it("should list files in a directory", async () => {
    const filePath = path.join(testDir, "test2.txt");
    await fs.writeFile(filePath, "Test 2");

    const readCapId = createCapability(1, "fs.read", { path: testDir });
    const readCap = {
      id: readCapId,
      owner_id: 1,
      type: "fs.read",
      params: { path: testDir },
      __brand: "Capability",
    };

    const files = await fsList.handler([readCap, testDir], mockCtx);
    expect(files).toContain("test.txt");
    expect(files).toContain("test2.txt");
  });

  it("should fail without capability", async () => {
    expect(fsWrite.handler([null, "path", "content"], mockCtx)).rejects.toThrow(
      "fs.write: missing capability",
    );
  });
});
