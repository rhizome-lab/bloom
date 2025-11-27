import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { scheduler } from "./scheduler";
import { db } from "./db";
import { createEntity, addVerb } from "./repo";

describe("Scheduler Verification", () => {
  let entityId: number;

  beforeAll(() => {
    // Create a test entity
    entityId = createEntity({
      name: "Scheduler Test Entity",
      kind: "ITEM",
      props: { count: 0 },
    });

    // Add a verb that increments a counter
    addVerb(entityId, "increment", [
      "set",
      "this",
      "count",
      ["+", ["prop", "this", "count"], 1],
    ]);
  });

  afterAll(() => {
    // Cleanup
    db.query("DELETE FROM scheduled_tasks").run();
  });

  it("should schedule a task", () => {
    scheduler.schedule(entityId, "increment", [], 100);
    const tasks = db.query("SELECT * FROM scheduled_tasks").all();
    expect(tasks.length).toBe(1);
  });

  it("should process due tasks", async () => {
    // Wait for task to be due
    await new Promise((resolve) => setTimeout(resolve, 150));

    await scheduler.process();

    // Check if task was deleted
    const tasks = db.query("SELECT * FROM scheduled_tasks").all();
    expect(tasks.length).toBe(0);

    // Check if effect happened (count incremented)
    // Note: In the real scheduler process, we use `evaluate` which might need mocking or real context.
    // The scheduler implementation imports `repo` dynamically.
    // Let's check the entity state.
    const { getEntity } = await import("./repo");
    const entity = getEntity(entityId);
    expect(entity?.props["count"]).toBe(1);
  });
});
