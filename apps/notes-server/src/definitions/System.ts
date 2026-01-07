// Entity definitions for Bloom
// These are parsed by bloom-syntax-typescript, not executed as TypeScript

import { EntityBase } from "./EntityBase";

export class System extends EntityBase {
  name = "System";
  description = "The system entity.";

  get_available_verbs(player: any) {
    const verbsList: any[] = [];
    const seen: Record<string, boolean> = {};

    const addVerbs = (entityId: number) => {
      const entityVerbs = verbs(entity(entityId));
      for (const verb of entityVerbs) {
        const key = str.concat(verb.name, ":", String(entityId));
        if (!obj.has(seen, key)) {
          obj.set(seen, key, true);
          list.push(verbsList, {
            entity_id: entityId,
            name: verb.name,
          });
        }
      }
    };

    // Add verbs from player
    addVerbs(player.id);

    // Add verbs from player's location
    if (player.location) {
      addVerbs(player.location);
    }

    return verbsList;
  }
}
