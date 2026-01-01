import { addVerb, createCapability, createEntity, updateEntity } from "../repo";
import { db } from "../db";
import { loadEntityDefinition } from "./loader";
import { resolve } from "node:path";

export interface FileBrowserSeedConfig {
  /** The root path for the file browser (sandbox root) */
  rootPath: string;
  /** Whether to grant write access */
  writable?: boolean;
}

/**
 * Seeds a file browser world.
 * Creates prototypes for file browser entities and a user instance.
 *
 * @returns IDs of created entities
 */
export function seedFileBrowser(config: FileBrowserSeedConfig) {
  const { rootPath, writable = false } = config;

  // Check if already seeded
  const root = db.query("SELECT id FROM entities").get();
  if (root !== null) {
    console.log("Database already seeded.");
    return null;
  }

  if (process.env.NODE_ENV !== "test") {
    console.log("Seeding file browser world...");
  }

  // 1. Create The Void (Root Zone)
  const voidId = createEntity({
    description: "The file system void.",
    name: "File System",
  });

  // 2. Load EntityBase for core verbs
  const entityBaseDef = loadEntityDefinition(
    resolve(__dirname, "definitions/EntityBase.ts"),
    "EntityBase",
  );
  const entityBaseId = createEntity({
    ...entityBaseDef.props,
    location: voidId,
  });

  for (const [name, code] of entityBaseDef.verbs) {
    addVerb(entityBaseId, name, code);
  }

  // Set Void prototype to EntityBase
  updateEntity({ id: voidId, prototype_id: entityBaseId });

  // 3. Create FileBrowserBase prototype
  const fbBaseDef = loadEntityDefinition(
    resolve(__dirname, "definitions/FileBrowser.ts"),
    "FileBrowserBase",
  );
  const fbBaseId = createEntity(
    {
      ...fbBaseDef.props,
      location: voidId,
    },
    entityBaseId,
  );

  for (const [name, code] of fbBaseDef.verbs) {
    addVerb(fbBaseId, name, code);
  }

  // 4. Create FileBrowserUser prototype
  const fbUserDef = loadEntityDefinition(
    resolve(__dirname, "definitions/FileBrowser.ts"),
    "FileBrowserUser",
  );
  const fbUserProtoId = createEntity(
    {
      ...fbUserDef.props,
      location: voidId,
    },
    fbBaseId,
  );

  for (const [name, code] of fbUserDef.verbs) {
    addVerb(fbUserProtoId, name, code);
  }

  // 5. Create the actual user instance
  const userId = createEntity(
    {
      name: "Browser",
      description: "A file browser instance.",
      location: voidId,
      cwd: rootPath,
      fs_root: rootPath,
      bookmarks: {},
      file_metadata: {},
    },
    fbUserProtoId,
  );

  // 6. Grant capabilities
  createCapability(userId, "fs.read", { path: rootPath });
  createCapability(userId, "entity.control", { target_id: userId });

  if (writable) {
    createCapability(userId, "fs.write", { path: rootPath });
  }

  if (process.env.NODE_ENV !== "test") {
    console.log(`File browser seeded with root: ${rootPath}`);
    console.log(`User ID: ${userId}`);
  }

  return {
    voidId,
    entityBaseId,
    fbBaseId,
    fbUserProtoId,
    userId,
  };
}
