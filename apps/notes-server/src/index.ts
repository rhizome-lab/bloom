import { scheduler, startServer } from "@viwo/core";
import { seedNotes } from "./seed";

async function main() {
  const port = parseInt(process.env["PORT"] ?? "8081", 10);

  console.log("Starting Viwo Notes Server...");

  // Start scheduler
  scheduler.start(100);

  // Seed notes world
  seedNotes();

  // Start server
  startServer(port);
  console.log(`Server listening on port ${port}`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
