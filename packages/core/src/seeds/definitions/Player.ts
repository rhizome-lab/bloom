// oxlint-disable-next-line no-unassigned-import
import "../../generated_types";
import { EntityBase } from "./EntityBase";

declare const ENTITY_BASE_ID_PLACEHOLDER: number;

export class Player extends EntityBase {
  override name = "Player Base";
  override description = "A generic adventurer.";

  look() {
    const argsList = std.args();
    if (list.empty(argsList)) {
      const me = entity(std.caller().id) as EntityBase;
      const room = resolve_props(entity(me.location!)) as EntityBase;
      const contents = room.contents ?? [];
      const exits = room.exits ?? [];
      const resolvedContents = list.map(
        contents,
        (id: number) => resolve_props(entity(id)) as EntityBase,
      );
      const resolvedExits = list.map(
        exits,
        (id: number) => resolve_props(entity(id)) as EntityBase,
      );

      send("update", {
        entities: list.concat([room], list.concat(resolvedContents, resolvedExits)),
      });
    } else {
      const targetName = std.arg(0);
      const targetId = call(std.caller(), "find", targetName);
      if (targetId) {
        const target = resolve_props(entity(targetId));
        send("update", { entities: [target] });
      } else {
        send("message", "You don't see that here.");
      }
    }
  }

  inventory() {
    const player = resolve_props(std.caller()) as EntityBase;
    const contents = player.contents ?? [];
    const resolvedItems = list.map(
      contents,
      (id: number) => resolve_props(entity(id)) as EntityBase,
    );
    const finalList = list.concat([player], resolvedItems);
    send("update", { entities: finalList });
  }

  whoami() {
    send("player_id", { playerId: std.caller().id });
  }

  dig(direction: string) {
    // Note: direction is arg 0. But extracting variable args is tricky in class methods if not explicit?
    // Wait, transpile unwrap logic should handle named args.
    // If we define dig(direction: string), arg(0) is mapped to direction.
    // The original code used `std.args()` to get rest args.
    // We can define `dig(direction: string, ...rest: any[])`?
    // Our transpiler likely just maps defined args.
    // We can access `std.arg` directly if needed inside method body for extra args,
    // OR we can rely on standard library `std.args()`.
    // The original code: `const roomName = str.join(list.slice(std.args(), 1), " ");`
    // This implies variable arguments.
    // Our new transpiler logic: `const direction = std.arg(0)`.
    // `std.args()` returns ALL args.
    // So `direction` will be effectively `arg(0)`.

    // However, existing implementation used: `const direction = std.arg(0);`

    const roomName = str.join(list.slice(std.args(), 1), " ");

    if (!direction) {
      send("message", "Where do you want to dig?");
    } else {
      const createCap = get_capability("sys.create", {});
      const caller = std.caller() as EntityBase;
      const controlCap =
        get_capability("entity.control", {
          target_id: caller.location,
        }) ?? get_capability("entity.control", { "*": true });

      if (createCap && controlCap) {
        const newRoomData: Record<string, any> = {};
        newRoomData["name"] = roomName;
        const newRoomId = createCap.create(newRoomData);

        const exitData: Record<string, any> = {};
        exitData["name"] = direction;
        exitData["location"] = caller.location;
        exitData["direction"] = direction;
        exitData["destination"] = newRoomId;
        const exitId = createCap.create(exitData);

        // ENTITY_BASE_ID_PLACEHOLDER needs to be handled.
        // In the original file it was an injected number by string replacement.
        // Here we are compiling TypeScript. We can't easily inject it AFTER compile unless we return string code.
        // BUT wait, `transpile` returns S-expression.
        // `EntityBase.ts` and `Player.ts` are compiled at runtime by `loader.ts`?
        // No, `loader.ts` reads the file source and transpiles it.
        // It's still using `transpile()`.
        // So `ENTITY_BASE_ID_PLACEHOLDER` will be transpiled as a variable.
        // We probably want to pass `EntityBase` ID into the constructor or closure?
        // Or we can rely on Global `entity_base_id`?
        // Or we can assume we will string-replace it in the loader potentially.
        // The original code `transpile(extractVerb(...).replace(...))` did string replacement on source.
        // We can do the same in `loader.ts` if we define placeholders.
        // But `loader.ts` parses AST.
        // If we leave `ENTITY_BASE_ID_PLACEHOLDER` as a global variable, the transpiler emits `std.var("ENTITY_BASE_ID_PLACEHOLDER")` (or similar).
        // If we want it to be a literal number, we need to replace it in the emitted code OR source.
        // Let's assume for now we will string replace in `seed.ts` logic on the emitted code string?
        // Actually, `loader.ts` returns `ScriptValue`. Replacing in JSON structure is hard.
        // Ideally we resolve it at runtime?
        // But `EntityBase` is created during seed. It has a dynamic ID.
        // Maybe we store `EntityBase` ID in a known place? Like System?
        // OR we just use `call(system, "get_entity_base_id")`?
        // That seems cleaner.
        // But for now to match exactly...
        // Let's assume I will replace the variable in `seed.ts` after loading.
        // OR I can use the same string replacement trick if I expose the source code from loader?
        // Loader returns `Map<string, ScriptValue>`.
        // I can change loader to perform replacements?
        // Let's stick to the placeholder and I'll handle replacement in `seed.ts`.
        // But I need to ensure `ENTITY_BASE_ID_PLACEHOLDER` is valid TS for `ts.createSourceFile`.
        // `declare const` works for that.

        controlCap.setPrototype(newRoomId, ENTITY_BASE_ID_PLACEHOLDER);

        const currentRoom = entity(caller.location!) as EntityBase;
        const exits = currentRoom.exits ?? [];
        list.push(exits, exitId);
        controlCap.update(currentRoom.id, { exits });

        // Back exit
        const backExitData: Record<string, any> = {};
        backExitData["name"] = "back";
        backExitData["location"] = newRoomId;
        backExitData["direction"] = "back";
        backExitData["destination"] = caller.location;
        const backExitId = createCap.create(backExitData);

        const newRoom = entity(newRoomId);
        const newExits: number[] = [];
        list.push(newExits, backExitId);

        const newRoomCap = get_capability("entity.control", {
          target_id: newRoomId,
        });
        if (newRoomCap) {
          newRoomCap.update(newRoom.id, { exits: newExits });
        }

        send("message", "You dig a new room.");
        call(std.caller(), "teleport", entity(newRoomId));
      } else {
        send("message", "You cannot dig here.");
      }
    }
  }

  create(name: string) {
    if (!name) {
      send("message", "What do you want to create?");
      return;
    }
    const createCap = get_capability("sys.create");
    const caller = std.caller() as EntityBase;
    const controlCap =
      get_capability("entity.control", { target_id: caller.location }) ??
      get_capability("entity.control", { "*": true });
    if (!createCap || !controlCap) {
      send("message", "You do not have permission to create here.");
      return;
    }
    const itemData: Record<string, any> = {};
    itemData["name"] = name;
    itemData["location"] = caller.location;
    const itemId = createCap.create(itemData);
    controlCap.setPrototype(itemId, ENTITY_BASE_ID_PLACEHOLDER);

    const room = entity(caller.location!) as EntityBase;
    const roomId = room.id;
    if (!roomId) {
      send("message", "DEBUG: Room missing");
      return;
    }
    if (!itemId) {
      send("message", "DEBUG: itemId missing");
      return;
    }
    const contents = room.contents ?? [];
    const newContents = list.concat(contents, [itemId]);
    controlCap.update(roomId, { contents: newContents });
    send(
      "message",
      `DEBUG: Added ${itemId} to room ${roomId} contents. New size: ${list.len(newContents)}`,
    );
    send("message", `You create ${name}.`);
    call(std.caller(), "look");
    return itemId;
  }

  set(targetName: string, propName: string, value: unknown) {
    if (!targetName) {
      send("message", "Usage: set <target> <prop> <value>");
      return;
    }
    if (!propName) {
      send("message", "Usage: set <target> <prop> <value>");
      return;
    }
    const targetId = call(this, "find", targetName);
    if (!targetId) {
      send("message", "I don't see that here.");
      return;
    }
    const controlCap =
      get_capability("entity.control", { target_id: targetId }) ??
      get_capability("entity.control", { "*": true });
    if (!controlCap) {
      send("message", "You do not have permission to modify this object.");
      return;
    }
    controlCap.update(targetId, { [propName]: value });
    send("message", "Property set.");
  }

  // Quest verbs
  quest_start(questName: string) {
    // Placeholder logic as per original
    send("message", `Started quest: ${questName}`);
  }

  quest_update(questName: string, status: string) {
    send("message", `Quest ${questName} updated to ${status}`);
  }

  quest_log() {
    send("message", "Quest Log: (Empty)");
  }
}
