import { Database } from "bun:sqlite";

export const db = new Database("world.sqlite", { create: true });

// Enable WAL mode for better concurrency
db.query("PRAGMA journal_mode = WAL;").run();

console.log("Database initialized");
