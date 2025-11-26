import { db } from "./db";

console.log("Dropping verbs table...");
db.query("DROP TABLE IF EXISTS verbs").run();
console.log("Dropped verbs table.");
