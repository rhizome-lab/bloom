import {
  addVerb,
  CORE_DEFINITIONS_PATH,
  createCapability,
  createEntity,
  db,
  loadEntityDefinition,
  updateEntity,
} from "@viwo/core";
import { join } from "node:path";

/**
 * Seeds a notes world.
 * Creates prototypes for notes entities and a user instance.
 *
 * @returns IDs of created entities
 */
export function seedNotes() {
  // Check if already seeded
  const root = db.query("SELECT id FROM entities").get();
  if (root !== null) {
    console.log("Database already seeded.");
    return null;
  }

  if (process.env.NODE_ENV !== "test") {
    console.log("Seeding notes world...");
  }

  // 1. Create The Void (Root Zone)
  const voidId = createEntity({
    description: "The notes void.",
    name: "Notes Realm",
  });

  // 2. Load EntityBase for core verbs (from core package)
  const entityBaseDef = loadEntityDefinition(
    join(CORE_DEFINITIONS_PATH, "EntityBase.ts"),
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

  // 3. Create NotesBase prototype
  const notesBaseDef = loadEntityDefinition(
    join(__dirname, "definitions/Notes.ts"),
    "NotesBase",
  );
  const notesBaseId = createEntity(
    {
      ...notesBaseDef.props,
      location: voidId,
    },
    entityBaseId,
  );

  for (const [name, code] of notesBaseDef.verbs) {
    addVerb(notesBaseId, name, code);
  }

  // 4. Create NotesUser prototype
  const notesUserDef = loadEntityDefinition(
    join(__dirname, "definitions/Notes.ts"),
    "NotesUser",
  );
  const notesUserProtoId = createEntity(
    {
      ...notesUserDef.props,
      location: voidId,
    },
    notesBaseId,
  );

  for (const [name, code] of notesUserDef.verbs) {
    addVerb(notesUserProtoId, name, code);
  }

  // 5. Create the actual user instance
  const userId = createEntity(
    {
      current_note_id: null,
      description: "A notes instance.",
      name: "Notebook",
      note_counter: 0,
      notes: {},
    },
    notesUserProtoId,
  );

  // 6. Grant capabilities
  createCapability(userId, "entity.control", { target_id: userId });

  if (process.env.NODE_ENV !== "test") {
    console.log("Notes world seeded.");
    console.log(`User ID: ${userId}`);
  }

  return {
    entityBaseId,
    notesBaseId,
    notesUserProtoId,
    userId,
    voidId,
  };
}
