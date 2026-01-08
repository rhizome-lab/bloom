import { addVerb, createEntity } from "../repo";
import { loadEntityDefinition } from "./loader";
import { resolve } from "path";

export function seedItems(locationId: number) {
  // 6. Book Item
  const bookDef = loadEntityDefinition(resolve(__dirname, "definitions/Items.ts"), "Book");

  const bookId = createEntity({
    chapters: [
      { content: "Welcome to the world of Viwo.", title: "Introduction" },
      { content: "The beginning of the journey.", title: "Chapter 1" },
    ],
    description: "A dusty old book. It seems to have many chapters.",
    location: locationId,
    name: "Dusty Book",
  });

  for (const [name, code] of bookDef.verbs) {
    addVerb(bookId, name, code);
  }
}
