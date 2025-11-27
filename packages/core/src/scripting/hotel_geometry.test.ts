import { describe, it, expect, beforeEach } from "bun:test";
import { evaluate } from "./interpreter";
import { registerListLibrary } from "./lib/list";
import { registerStringLibrary } from "./lib/string";
import { registerObjectLibrary } from "./lib/object";
import { registerOpcode } from "./interpreter";
import { Entity } from "../repo";

describe("Hotel Geometry Scripting", () => {
  let elevator: Entity;
  let floorLobbyProto: Entity;
  let wingProto: Entity;
  let roomProto: Entity;
  let caller: Entity;
  let messages: string[] = [];
  let entities: Record<number, Entity> = {};
  let nextId = 100;

  beforeEach(() => {
    messages = [];
    entities = {};
    nextId = 100;

    registerListLibrary();
    registerStringLibrary();
    registerObjectLibrary();

    registerOpcode("tell", async (args, ctx) => {
      const [targetExpr, msgExpr] = args;
      if (targetExpr === "caller") {
        const msg = await evaluate(msgExpr, ctx);
        messages.push(msg);
      }
      return null;
    });

    registerOpcode("move", async (args, ctx) => {
      const [targetExpr, destExpr] = args;
      let target = await evaluate(targetExpr, ctx);
      let dest = await evaluate(destExpr, ctx);

      if (target === "caller") target = ctx.caller;
      if (target === "this") target = ctx.this;
      if (dest === "caller") dest = ctx.caller;
      if (dest === "this") dest = ctx.this;

      const targetEntity = target?.id ? target : entities[target];
      const destEntity = dest?.id ? dest : entities[dest];

      console.log("MOVE DEBUG:", {
        targetExpr,
        destExpr,
        target: target?.id || target,
        dest: dest?.id || dest,
        targetEntityId: targetEntity?.id,
        destEntityId: destEntity?.id,
      });

      if (targetEntity && destEntity) {
        targetEntity.location_id = destEntity.id;
      }
      return true;
    });

    registerOpcode("create", async (args, ctx) => {
      const [dataExpr] = args;
      const data = await evaluate(dataExpr, ctx);
      const id = nextId++;
      entities[id] = {
        id,
        name: data.name,
        kind: data.kind,
        prototype_id: data.prototype_id,
        props: data.props || {},
        location_id: data.location_id,
      } as any;
      console.log("CREATE DEBUG:", { id, name: data.name, props: data.props });
      return id;
    });

    registerOpcode("destroy", async (args, ctx) => {
      const [targetExpr] = args;
      let target = await evaluate(targetExpr, ctx);
      if (target === "this") target = ctx.this;

      if (target && target.id) {
        delete entities[target.id];
      }
      return true;
    });

    registerOpcode("prop", async (args, ctx) => {
      const [targetExpr, keyExpr] = args;
      const key = await evaluate(keyExpr, ctx);
      let target = await evaluate(targetExpr, ctx);

      if (target === "this") target = ctx.this;
      if (target === "caller") target = ctx.caller;

      console.log("PROP DEBUG:", { key, targetId: target?.id });

      if (target) {
        if (key in target) return (target as any)[key];
        if (target.props && key in target.props) return target.props[key];
      }
      return null;
    });

    registerOpcode("set", async (args, ctx) => {
      const [targetExpr, keyExpr, valExpr] = args;
      const key = await evaluate(keyExpr, ctx);
      const val = await evaluate(valExpr, ctx);
      let target = await evaluate(targetExpr, ctx);

      if (target === "this") target = ctx.this;

      if (target) {
        target.props[key] = val;
      }
      return val;
    });

    // Setup Entities
    elevator = {
      id: 1,
      name: "Elevator",
      kind: "ROOM",
      props: { current_floor: 1 },
    } as any;
    entities[1] = elevator;

    floorLobbyProto = {
      id: 2,
      name: "Floor Lobby Proto",
      kind: "ROOM",
      props: {},
    } as any;
    entities[2] = floorLobbyProto;

    wingProto = { id: 3, name: "Wing Proto", kind: "ROOM", props: {} } as any;
    entities[3] = wingProto;

    roomProto = { id: 4, name: "Room Proto", kind: "ROOM", props: {} } as any;
    entities[4] = roomProto;

    caller = {
      id: 5,
      name: "Guest",
      kind: "ACTOR",
      location_id: 1,
      props: {},
    } as any;
    entities[5] = caller;
  });

  it("should navigate elevator -> floor lobby -> wing -> room and back", async () => {
    // 1. Push 5
    const pushScript = [
      "seq",
      ["let", "floor", ["arg", 0]],
      ["set", "this", "current_floor", ["var", "floor"]],
      [
        "tell",
        "caller",
        [
          "str.concat",
          "The elevator hums and moves to floor ",
          ["var", "floor"],
          ".",
        ],
      ],
    ];
    await evaluate(pushScript, {
      caller,
      this: elevator,
      args: [5],
      warnings: [],
    });
    expect(elevator.props["current_floor"]).toBe(5);

    // 2. Out (to Floor 5 Lobby)
    const outScript = [
      "seq",
      ["let", "floor", ["prop", "this", "current_floor"]],
      [
        "if",
        ["==", ["var", "floor"], 1],
        ["tell", "caller", "Lobby"], // Mock branch
        [
          "seq",
          ["let", "lobbyData", {}],
          [
            "obj.set",
            ["var", "lobbyData"],
            "name",
            ["str.concat", "Floor ", ["var", "floor"], " Lobby"],
          ],
          ["obj.set", ["var", "lobbyData"], "kind", "ROOM"],
          ["obj.set", ["var", "lobbyData"], "prototype_id", 2],

          ["let", "props", {}],
          ["obj.set", ["var", "props"], "floor", ["var", "floor"]],
          ["obj.set", ["var", "props"], "elevator_id", 1],

          ["obj.set", ["var", "lobbyData"], "props", ["var", "props"]],

          ["let", "lobbyId", ["create", ["var", "lobbyData"]]],
          ["move", "caller", ["var", "lobbyId"]],
        ],
      ],
    ];
    await evaluate(outScript, {
      caller,
      this: elevator,
      args: [],
      warnings: [],
    });

    const floorLobbyId = caller.location_id!;
    expect(floorLobbyId).not.toBe(1);
    expect(entities[floorLobbyId]!.name).toBe("Floor 5 Lobby");

    // 3. West (to West Wing)
    const floorLobby = entities[floorLobbyId]!;
    const westScript = [
      "seq",
      ["let", "floor", ["prop", "this", "floor"]],

      ["let", "wingData", {}],
      [
        "obj.set",
        ["var", "wingData"],
        "name",
        ["str.concat", "Floor ", ["var", "floor"], " West Wing"],
      ],
      ["obj.set", ["var", "wingData"], "kind", "ROOM"],
      ["obj.set", ["var", "wingData"], "prototype_id", 3],

      ["let", "props", {}],
      ["obj.set", ["var", "props"], "floor", ["var", "floor"]],
      ["obj.set", ["var", "props"], "return_id", ["prop", "this", "id"]], // Return to THIS lobby

      ["obj.set", ["var", "wingData"], "props", ["var", "props"]],

      ["let", "wingId", ["create", ["var", "wingData"]]],
      ["move", "caller", ["var", "wingId"]],
    ];
    await evaluate(westScript, {
      caller,
      this: floorLobby,
      args: [],
      warnings: [],
    });

    const wingId = caller.location_id!;
    expect(entities[wingId]!.name).toBe("Floor 5 West Wing");

    // 4. Enter 501 (to Room)
    const wing = entities[wingId]!;
    const enterScript = [
      "seq",
      ["let", "roomNum", ["arg", 0]],

      ["let", "roomData", {}],
      [
        "obj.set",
        ["var", "roomData"],
        "name",
        ["str.concat", "Room ", ["var", "roomNum"]],
      ],
      ["obj.set", ["var", "roomData"], "kind", "ROOM"],
      ["obj.set", ["var", "roomData"], "prototype_id", 4],

      ["let", "props", {}],
      ["obj.set", ["var", "props"], "lobby_id", ["prop", "this", "id"]],

      ["obj.set", ["var", "roomData"], "props", ["var", "props"]],

      ["let", "roomId", ["create", ["var", "roomData"]]],
      ["move", "caller", ["var", "roomId"]],
    ];
    await evaluate(enterScript, {
      caller,
      this: wing,
      args: ["501"],
      warnings: [],
    });

    const roomId = caller.location_id!;
    expect(entities[roomId]!.name).toBe("Room 501");

    // 5. Leave (back to Wing)
    const room = entities[roomId]!;
    const leaveScript = [
      "seq",
      ["let", "lobbyId", ["prop", "this", "lobby_id"]],
      ["move", "caller", ["var", "lobbyId"]],
      ["destroy", "this"],
    ];
    await evaluate(leaveScript, { caller, this: room, args: [], warnings: [] });

    expect(caller.location_id).toBe(wingId);
    expect(entities[roomId]).toBeUndefined();

    // 6. Back (back to Floor Lobby)
    const backScript = [
      "seq",
      ["let", "returnId", ["prop", "this", "return_id"]],
      ["move", "caller", ["var", "returnId"]],
      ["destroy", "this"],
    ];
    await evaluate(backScript, { caller, this: wing, args: [], warnings: [] });

    expect(caller.location_id).toBe(floorLobbyId);
    expect(entities[wingId]).toBeUndefined();

    // 7. Elevator (back to Elevator)
    const elevatorScript = [
      "seq",
      ["let", "elevId", ["prop", "this", "elevator_id"]],
      ["move", "caller", ["var", "elevId"]],
      ["destroy", "this"],
    ];
    await evaluate(elevatorScript, {
      caller,
      this: floorLobby,
      args: [],
      warnings: [],
    });

    expect(caller.location_id).toBe(1);
    expect(entities[floorLobbyId]).toBeUndefined();
  });
});
