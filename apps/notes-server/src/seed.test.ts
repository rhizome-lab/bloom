import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { createScriptContext, evaluate } from "@viwo/scripting";
import { db, GameOpcodes, getEntity, getVerb } from "@viwo/core";
import type { Entity } from "@viwo/shared/jsonrpc";
import { seedNotes } from "./seed";

describe("Notes Seed", () => {
  let userId: number;
  let send: (type: string, payload: unknown) => void;
  let sentMessages: Array<{ type: string; payload: unknown }> = [];

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    sentMessages = [];
    send = (type: string, payload: unknown) => {
      sentMessages.push({ type, payload });
    };

    // Seed notes world
    const result = seedNotes();
    userId = result!.userId;
  });

  const runVerb = async (
    entity: Entity,
    verbName: string,
    args: unknown[] = [],
    caller?: Entity,
  ) => {
    const freshEntity = getEntity(entity.id)!;
    const verb = getVerb(freshEntity.id, verbName);
    if (!verb) {
      throw new Error(`Verb ${verbName} not found on entity ${freshEntity.id}`);
    }

    const ctx = createScriptContext({
      args,
      caller: caller ?? freshEntity,
      gas: 100_000,
      ops: GameOpcodes,
      send,
      this: freshEntity,
    });

    return evaluate(verb.code, ctx);
  };

  describe("list_notes verb", () => {
    it("should return empty list initially", async () => {
      const user = getEntity(userId)!;
      const result = (await runVerb(user, "list_notes")) as {
        type: string;
        notes: unknown[];
      };

      expect(result.type).toBe("notes_list");
      expect(result.notes).toEqual([]);
    });
  });

  describe("create_note verb", () => {
    it("should create a new note", async () => {
      const user = getEntity(userId)!;
      const result = (await runVerb(user, "create_note", ["My First Note", "Hello world!"])) as {
        type: string;
        note: { id: string; title: string; content: string };
      };

      expect(result.type).toBe("note_created");
      expect(result.note.title).toBe("My First Note");
      expect(result.note.content).toBe("Hello world!");
      expect(result.note.id).toBeDefined();
    });

    it("should create a note with empty content", async () => {
      const user = getEntity(userId)!;
      const result = (await runVerb(user, "create_note", ["Empty Note"])) as {
        type: string;
        note: { content: string };
      };

      expect(result.type).toBe("note_created");
      expect(result.note.content).toBe("");
    });

    it("should throw on missing title", async () => {
      const user = getEntity(userId)!;
      await expect(runVerb(user, "create_note", [])).rejects.toThrow(/usage/i);
    });
  });

  describe("get_note verb", () => {
    it("should get a note by ID", async () => {
      const user = getEntity(userId)!;

      // Create a note first
      const createResult = (await runVerb(user, "create_note", ["Test Note", "Content here"])) as {
        note: { id: string };
      };
      const noteId = createResult.note.id;

      // Get the note
      const result = (await runVerb(getEntity(userId)!, "get_note", [noteId])) as {
        type: string;
        note: { id: string; title: string };
        backlinks: unknown[];
      };

      expect(result.type).toBe("note_content");
      expect(result.note.id).toBe(noteId);
      expect(result.note.title).toBe("Test Note");
      expect(result.backlinks).toEqual([]);
    });

    it("should throw on non-existent note", async () => {
      const user = getEntity(userId)!;
      await expect(runVerb(user, "get_note", ["nonexistent-id"])).rejects.toThrow(/not found/i);
    });
  });

  describe("update_note verb", () => {
    it("should update note content", async () => {
      const user = getEntity(userId)!;

      // Create a note
      const createResult = (await runVerb(user, "create_note", ["Original Title", "Original content"])) as {
        note: { id: string };
      };
      const noteId = createResult.note.id;

      // Update it
      const result = (await runVerb(getEntity(userId)!, "update_note", [noteId, "New content"])) as {
        type: string;
        note: { content: string; title: string };
      };

      expect(result.type).toBe("note_updated");
      expect(result.note.content).toBe("New content");
      expect(result.note.title).toBe("Original Title");
    });

    it("should update title and content", async () => {
      const user = getEntity(userId)!;

      // Create a note
      const createResult = (await runVerb(user, "create_note", ["Original", "Content"])) as {
        note: { id: string };
      };
      const noteId = createResult.note.id;

      // Update with new title
      const result = (await runVerb(getEntity(userId)!, "update_note", [noteId, "New content", "New Title"])) as {
        type: string;
        note: { content: string; title: string };
      };

      expect(result.note.title).toBe("New Title");
      expect(result.note.content).toBe("New content");
    });
  });

  describe("delete_note verb", () => {
    it("should delete a note", async () => {
      const user = getEntity(userId)!;

      // Create a note
      const createResult = (await runVerb(user, "create_note", ["To Delete", "Content"])) as {
        note: { id: string };
      };
      const noteId = createResult.note.id;

      // Delete it
      const result = (await runVerb(getEntity(userId)!, "delete_note", [noteId])) as {
        type: string;
        id: string;
      };

      expect(result.type).toBe("note_deleted");
      expect(result.id).toBe(noteId);

      // Verify it's gone
      await expect(runVerb(getEntity(userId)!, "get_note", [noteId])).rejects.toThrow(/not found/i);
    });
  });

  describe("backlinks", () => {
    it("should find notes that link to a note", async () => {
      const user = getEntity(userId)!;

      // Create target note
      const target = (await runVerb(user, "create_note", ["Target Note", "This is the target."])) as {
        note: { id: string };
      };

      // Create linking note with links array (client extracts these via mdast)
      await runVerb(getEntity(userId)!, "create_note", [
        "Linking Note",
        "This links to [[Target Note]] here.",
        ["Target Note"], // links extracted by client
      ]);

      // Get backlinks for target
      const result = (await runVerb(getEntity(userId)!, "get_backlinks", [target.note.id])) as {
        type: string;
        backlinks: Array<{ id: string; title: string; context: string }>;
      };

      expect(result.type).toBe("backlinks");
      expect(result.backlinks.length).toBe(1);
      expect(result.backlinks[0].title).toBe("Linking Note");
      expect(result.backlinks[0].context).toContain("[[Target Note]]");
    });

    it("should find backlinks via aliases", async () => {
      const user = getEntity(userId)!;

      // Create target note
      const target = (await runVerb(user, "create_note", ["Full Title", "Target content"])) as {
        note: { id: string };
      };

      // Add alias
      await runVerb(getEntity(userId)!, "add_alias", [target.note.id, "Alias"]);

      // Create linking note using alias (links array extracted by client)
      await runVerb(getEntity(userId)!, "create_note", [
        "Linker",
        "Links via [[Alias]] here.",
        ["Alias"], // client-extracted link
      ]);

      // Get backlinks
      const result = (await runVerb(getEntity(userId)!, "get_backlinks", [target.note.id])) as {
        type: string;
        backlinks: Array<{ title: string }>;
      };

      expect(result.backlinks.length).toBe(1);
      expect(result.backlinks[0].title).toBe("Linker");
    });

    it("should include backlinks when getting a note", async () => {
      const user = getEntity(userId)!;

      // Create target note
      const target = (await runVerb(user, "create_note", ["Note A", "Content A"])) as {
        note: { id: string };
      };

      // Create linking note with links
      await runVerb(getEntity(userId)!, "create_note", [
        "Note B",
        "References [[Note A]] inside.",
        ["Note A"],
      ]);

      // Get target note
      const result = (await runVerb(getEntity(userId)!, "get_note", [target.note.id])) as {
        type: string;
        note: { title: string };
        backlinks: Array<{ title: string }>;
      };

      expect(result.backlinks.length).toBe(1);
      expect(result.backlinks[0].title).toBe("Note B");
    });
  });

  describe("tags", () => {
    it("should add and remove tags", async () => {
      const user = getEntity(userId)!;

      // Create a note
      const createResult = (await runVerb(user, "create_note", ["Tagged Note", "Content"])) as {
        note: { id: string };
      };
      const noteId = createResult.note.id;

      // Add tag
      const addResult = (await runVerb(getEntity(userId)!, "add_tag", [noteId, "important"])) as {
        type: string;
        tag: string;
      };
      expect(addResult.type).toBe("tag_added");
      expect(addResult.tag).toBe("important");

      // Verify tag is on note
      const getResult = (await runVerb(getEntity(userId)!, "get_note", [noteId])) as {
        note: { tags: string[] };
      };
      expect(getResult.note.tags).toContain("important");

      // Remove tag
      const removeResult = (await runVerb(getEntity(userId)!, "remove_tag", [noteId, "important"])) as {
        type: string;
      };
      expect(removeResult.type).toBe("tag_removed");

      // Verify tag is removed
      const finalResult = (await runVerb(getEntity(userId)!, "get_note", [noteId])) as {
        note: { tags: string[] };
      };
      expect(finalResult.note.tags).not.toContain("important");
    });
  });

  describe("search_notes verb", () => {
    it("should search by title", async () => {
      const user = getEntity(userId)!;

      // Create some notes
      await runVerb(user, "create_note", ["Meeting Notes", "Content 1"]);
      await runVerb(getEntity(userId)!, "create_note", ["Project Ideas", "Content 2"]);
      await runVerb(getEntity(userId)!, "create_note", ["Meeting Agenda", "Content 3"]);

      // Search
      const result = (await runVerb(getEntity(userId)!, "search_notes", ["Meeting"])) as {
        type: string;
        notes: Array<{ title: string }>;
      };

      expect(result.type).toBe("search_results");
      expect(result.notes.length).toBe(2);
      const titles = result.notes.map((n) => n.title);
      expect(titles).toContain("Meeting Notes");
      expect(titles).toContain("Meeting Agenda");
    });

    it("should search by content", async () => {
      const user = getEntity(userId)!;

      // Create notes
      await runVerb(user, "create_note", ["Note One", "Contains the keyword here"]);
      await runVerb(getEntity(userId)!, "create_note", ["Note Two", "No match"]);

      // Search
      const result = (await runVerb(getEntity(userId)!, "search_notes", ["keyword"])) as {
        notes: Array<{ title: string }>;
      };

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].title).toBe("Note One");
    });
  });

  describe("find_note_by_title verb", () => {
    it("should find note by exact title", async () => {
      const user = getEntity(userId)!;

      // Create a note
      await runVerb(user, "create_note", ["My Note", "Content"]);

      // Find it
      const result = (await runVerb(getEntity(userId)!, "find_note_by_title", ["My Note"])) as {
        id: string;
        title: string;
      } | null;

      expect(result).not.toBeNull();
      expect(result!.title).toBe("My Note");
    });

    it("should find note by alias", async () => {
      const user = getEntity(userId)!;

      // Create note and add alias
      const createResult = (await runVerb(user, "create_note", ["Full Name", "Content"])) as {
        note: { id: string };
      };
      await runVerb(getEntity(userId)!, "add_alias", [createResult.note.id, "Short"]);

      // Find by alias
      const result = (await runVerb(getEntity(userId)!, "find_note_by_title", ["Short"])) as {
        title: string;
      } | null;

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Full Name");
    });

    it("should be case insensitive", async () => {
      const user = getEntity(userId)!;

      await runVerb(user, "create_note", ["CamelCase Note", "Content"]);

      const result = (await runVerb(getEntity(userId)!, "find_note_by_title", ["camelcase note"])) as {
        title: string;
      } | null;

      expect(result).not.toBeNull();
      expect(result!.title).toBe("CamelCase Note");
    });

    it("should return null for non-existent note", async () => {
      const user = getEntity(userId)!;

      const result = await runVerb(getEntity(userId)!, "find_note_by_title", ["Nonexistent"]);

      expect(result).toBeNull();
    });
  });
});
