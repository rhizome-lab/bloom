import { Database } from "bun:sqlite";
import { initSchema } from "./schema";

export const db = new Database("world.sqlite", { create: true });

// Enable WAL mode for better concurrency
db.query("PRAGMA journal_mode = WAL;").run();

// Initialize Schema
initSchema(db);

console.log("Database initialized with ECS schema (v2)");
