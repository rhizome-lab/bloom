import { createEntity, addVerb, createCapability } from "../repo";
import { transpile } from "@viwo/scripting";
import { extractVerb } from "../verb_loader";
import { resolve } from "path";

const verbsPath = resolve(__dirname, "verbs.ts");

export function seedHotel(lobbyId: number, voidId: number, entityBaseId: number) {
  // 1. Hotel Lobby (already exists as lobbyId, passed in)
  addVerb(lobbyId, "room_vacated", transpile(extractVerb(verbsPath, "hotel_lobby_room_vacated")));

  // 1b. Room Prototype
  const roomProtoId = createEntity(
    {
      name: "Room Prototype",
      location: voidId,
      description: "A standard hotel room.",
    },
    entityBaseId,
  );
  addVerb(
    roomProtoId,
    "on_leave",
    transpile(
      extractVerb(verbsPath, "hotel_room_on_leave").replace(
        "HOTEL_LOBBY_ID_PLACEHOLDER",
        String(lobbyId),
      ),
    ),
  );

  // 1c. Wing Prototype
  const wingProtoId = createEntity(
    {
      name: "Wing Prototype",
      location: voidId,
      description: "A hotel wing.",
    },
    entityBaseId,
  );
  addVerb(wingProtoId, "on_enter", transpile(extractVerb(verbsPath, "wing_on_enter")));
  addVerb(
    wingProtoId,
    "enter",
    transpile(
      extractVerb(verbsPath, "wing_enter_room").replace(
        "HOTEL_ROOM_PROTO_ID_PLACEHOLDER",
        String(roomProtoId),
      ),
    ),
  );

  // 2. Elevator
  const elevatorId = createEntity(
    {
      name: "Glass Elevator",
      location: lobbyId,
      description: "A shiny glass elevator that can take you to any floor.",
      current_floor: 1,
      floors: {},
    },
    entityBaseId,
  );
  createCapability(elevatorId, "entity.control", { target_id: elevatorId });

  addVerb(elevatorId, "push", transpile(extractVerb(verbsPath, "elevator_push")));
  addVerb(
    elevatorId,
    "go",
    transpile(
      extractVerb(verbsPath, "elevator_go").replace(
        "WING_PROTO_ID_PLACEHOLDER",
        String(wingProtoId),
      ),
    ),
  );

  // 3. Floors and Rooms
  // Floors are now created on demand by the elevator.
  // We need to give the elevator the ability to create things.
  createCapability(elevatorId, "sys.create", {});
  // Also needs control over everything to link exits?
  // Actually, when it creates a floor, it gets control of it.
  // But it needs to link the floor lobby to itself (the elevator).
  // The elevator is already created.

  // We also need to give the elevator the 'on_enter' verb so it can clean up floors when people leave them.
  // Wait, 'on_enter' on the elevator means when someone enters the elevator.
  // Yes, if they enter the elevator FROM a floor, we check if that floor is empty.
  addVerb(elevatorId, "on_enter", transpile(extractVerb(verbsPath, "elevator_on_enter")));

  // 4. NPCs
  const receptionistId = createEntity(
    {
      name: "Receptionist",
      location: lobbyId,
      description: "A friendly receptionist standing behind the desk.",
    },
    entityBaseId,
  );
  addVerb(receptionistId, "on_hear", transpile(extractVerb(verbsPath, "receptionist_on_hear")));

  const golemId = createEntity(
    {
      name: "Security Golem",
      location: lobbyId,
      description: "A massive stone golem guarding the entrance.",
    },
    entityBaseId,
  );
  addVerb(golemId, "on_hear", transpile(extractVerb(verbsPath, "golem_on_hear")));
}
