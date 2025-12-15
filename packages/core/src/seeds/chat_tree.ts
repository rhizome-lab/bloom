import { addVerb, createCapability, createEntity } from "../repo";
import { loadEntityDefinition } from "./loader";
import { resolve } from "node:path";

export function seedChatTree(playerId: number) {
  // Load ChatTree Definition
  const chatTreeDef = loadEntityDefinition(
    resolve(__dirname, "./definitions/ChatTree.ts"),
    "ChatTree",
  );

  // Create ChatTree Prototype
  const chatTreeProtoId = createEntity({
    description: "A branching conversation tree for roleplay.",
    name: "Chat Tree Prototype",
  });

  // Grant capabilities to prototype
  createCapability(chatTreeProtoId, "sys.create", {});
  createCapability(chatTreeProtoId, "entity.control", { "*": true });

  // Add verbs to prototype
  for (const [name, code] of chatTreeDef.verbs) {
    addVerb(chatTreeProtoId, name, code);
  }

  // Create an example chat tree instance
  const exampleTreeId = createEntity(
    {
      active_branch: "main",
      branches: { main: null },
      description: "An example branching conversation.",
      location: playerId,
      messages: {},
      name: "Example Chat Tree",
      next_message_id: 1,
    },
    chatTreeProtoId,
  );

  // Grant capabilities to instance (capabilities don't inherit from prototypes)
  createCapability(exampleTreeId, "sys.create", {});
  createCapability(exampleTreeId, "entity.control", { "*": true });

  return { chatTreeProtoId, exampleTreeId };
}
