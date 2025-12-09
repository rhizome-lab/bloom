import { BaseCapability, checkCapability, registerCapabilityClass } from "@viwo/core";
import { type Capability, ScriptError, defineOpcode } from "@viwo/scripting";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function checkFsCapability(ctx: any, cap: Capability, type: string, targetPath: string) {
  checkCapability(cap, ctx.this.id, type, (params) => {
    const allowedPath = params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      return false;
    }

    const resolvedTarget = resolve(targetPath);
    const resolvedAllowed = resolve(allowedPath);

    return resolvedTarget.startsWith(resolvedAllowed);
  });
}

export class FsRead extends BaseCapability {
  static override readonly type = "fs.read";

  async read(filePath: string, ctx: any) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("fs.read: missing capability");
    }

    if (typeof filePath !== "string") {
      throw new ScriptError("fs.read: path must be a string");
    }

    // Reuse checkFsCapability logic or inline it
    // Inline adaptation:
    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("fs.read: invalid capability params");
    }
    const resolvedTarget = resolve(filePath);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("fs.read: path not allowed");
    }

    try {
      return await readFile(filePath, "utf8");
    } catch (error: any) {
      throw new ScriptError(`fs.read failed: ${error.message}`);
    }
  }

  async list(dirPath: string, ctx: any) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("fs.list: missing capability");
    }
    if (typeof dirPath !== "string") {
      throw new ScriptError("fs.list: path must be a string");
    }

    // Check against this capability params
    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("fs.list: invalid capability params");
    }
    const resolvedTarget = resolve(dirPath);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("fs.list: path not allowed");
    }

    try {
      return await readdir(dirPath);
    } catch (error: any) {
      throw new ScriptError(`fs.list failed: ${error.message}`);
    }
  }
}

export class FsWrite extends BaseCapability {
  static override readonly type = "fs.write";

  async write(filePath: string, content: string, ctx: any) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("fs.write: missing capability");
    }
    if (typeof filePath !== "string") {
      throw new ScriptError("fs.write: path must be a string");
    }
    if (typeof content !== "string") {
      throw new ScriptError("fs.write: content must be a string");
    }

    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("fs.write: invalid capability params");
    }
    const resolvedTarget = resolve(filePath);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("fs.write: path not allowed");
    }

    try {
      await writeFile(filePath, content, "utf8");
      return null;
    } catch (error: any) {
      throw new ScriptError(`fs.write failed: ${error.message}`);
    }
  }
}

registerCapabilityClass(FsRead.type, FsRead);
registerCapabilityClass(FsWrite.type, FsWrite);

export const fsRead = defineOpcode<[Capability | null, string], Promise<string>>("fs.read", {
  handler: async ([cap, filePath], ctx) => {
    if (!cap) {
      throw new ScriptError("fs.read: missing capability");
    }

    if (typeof filePath !== "string") {
      throw new ScriptError("fs.read: path must be a string");
    }

    checkFsCapability(ctx, cap, "fs.read", filePath);

    try {
      return await readFile(filePath, "utf8");
    } catch (error: any) {
      throw new ScriptError(`fs.read failed: ${error.message}`);
    }
  },
  metadata: {
    category: "fs",
    description: "Read content from a file",
    label: "Read File",
    parameters: [
      { description: "The capability to use.", name: "cap", type: "Capability | null" },
      { description: "The path to read.", name: "path", type: "string" },
    ],
    returnType: "Promise<string>",
    slots: [
      { name: "Cap", type: "block" },
      { name: "Path", type: "string" },
    ],
  },
});

export const fsWrite = defineOpcode<[Capability | null, string, string], Promise<null>>(
  "fs.write",
  {
    handler: async ([cap, filePath, content], ctx) => {
      if (!cap) {
        throw new ScriptError("fs.write: missing capability");
      }

      if (typeof filePath !== "string") {
        throw new ScriptError("fs.write: path must be a string");
      }
      if (typeof content !== "string") {
        throw new ScriptError("fs.write: content must be a string");
      }

      checkFsCapability(ctx, cap, "fs.write", filePath);

      try {
        await writeFile(filePath, content, "utf8");
        return null;
      } catch (error: any) {
        throw new ScriptError(`fs.write failed: ${error.message}`);
      }
    },
    metadata: {
      category: "fs",
      description: "Write content to a file",
      label: "Write File",
      parameters: [
        { description: "The capability to use.", name: "cap", type: "Capability | null" },
        { description: "The path to write to.", name: "path", type: "string" },
        { description: "The content to write.", name: "content", type: "string" },
      ],
      returnType: "Promise<null>",
      slots: [
        { name: "Cap", type: "block" },
        { name: "Path", type: "string" },
        { name: "Content", type: "string" },
      ],
    },
  },
);

export const fsList = defineOpcode<[Capability | null, string], Promise<readonly string[]>>(
  "fs.list",
  {
    handler: async ([cap, dirPath], ctx) => {
      if (!cap) {
        throw new ScriptError("fs.list: missing capability");
      }

      if (typeof dirPath !== "string") {
        throw new ScriptError("fs.list: path must be a string");
      }

      checkFsCapability(ctx, cap, "fs.read", dirPath);

      try {
        return await readdir(dirPath);
      } catch (error: any) {
        throw new ScriptError(`fs.list failed: ${error.message}`);
      }
    },
    metadata: {
      category: "fs",
      description: "List contents of a directory",
      label: "List Directory",
      parameters: [
        { name: "cap", type: "Capability | null" },
        { name: "path", type: "string" },
      ],
      returnType: "Promise<readonly string[]>",
      slots: [
        { name: "Cap", type: "block" },
        { name: "Path", type: "string" },
      ],
    },
  },
);
