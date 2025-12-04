import {
  createEntity,
  addVerb,
  updateVerb,
  getVerb,
  createCapability,
  updateEntity,
  getEntity,
} from "../repo";
import { StdLib, ObjectLib, StringLib, ListLib, BooleanLib } from "@viwo/scripting";
import * as CoreLib from "../runtime/lib/core";
import * as KernelLib from "../runtime/lib/kernel";

export function seedHotel(lobbyId: number, voidId: number, entityBaseId: number) {
  // Hotel Implementation
  const exitPrototypeId = 1;

  // Hotel Lobby
  const hotelLobbyProps = {
    name: "Grand Hotel Lobby",
    location: voidId,
    description: "The lavish lobby of the Grand Hotel. The elevator is to the side.",
  };
  const hotelLobbyId = createEntity(hotelLobbyProps, entityBaseId);

  createCapability(hotelLobbyId, "entity.control", { target_id: hotelLobbyId });

  // Connect Hotel Lobby to Main Lobby
  const hotelExitId = createEntity(
    {
      name: "hotel",
      location: lobbyId,
      direction: "hotel",
      destination: hotelLobbyId,
    },
    exitPrototypeId,
  );

  const outExitId = createEntity(
    {
      name: "out",
      location: hotelLobbyId,
      direction: "out",
      destination: lobbyId,
    },
    exitPrototypeId,
  );

  const lobby = getEntity(lobbyId)!;
  updateEntity({
    ...lobby,
    exits: [...((lobby["exits"] as never[]) ?? []), hotelExitId],
  });
  updateEntity({ id: hotelLobbyId, ...hotelLobbyProps, exits: [outExitId] });

  // Hotel Room Prototype (Hidden)
  const hotelRoomProtoId = createEntity(
    {
      name: "Hotel Room Prototype",
      location: voidId,
      description: "A generic hotel room.",
    },
    entityBaseId,
  );

  // Verb: leave (on the prototype)
  // Moves player back to lobby and destroys the room
  addVerb(
    hotelRoomProtoId,
    "leave",
    StdLib.seq(
      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(hotelLobbyId)), // Move player out first
      CoreLib.call(StdLib.caller(), "tell", "You leave the room and it fades away behind you."),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.this(), "id")]),
        ),
      ),
      CoreLib.destroy(StdLib.var("cap"), StdLib.this()), // Destroy the room
    ),
  );

  // Update 'leave' verb to use prop
  updateVerb(
    getVerb(hotelRoomProtoId, "leave")!.id,
    StdLib.seq(
      StdLib.let("lobbyId", ObjectLib.objGet(StdLib.this(), "lobby_id")),
      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("lobbyId"))),
      CoreLib.call(StdLib.caller(), "tell", "You leave the room and it fades away behind you."),
      // Destroy contents (furnishings)
      StdLib.let("freshThis", CoreLib.entity(ObjectLib.objGet(StdLib.this(), "id"))),
      StdLib.let(
        "contents",
        ObjectLib.objGet(StdLib.var("freshThis"), "contents", ListLib.listNew()),
      ),
      StdLib.for(
        "itemId",
        StdLib.var("contents"),
        StdLib.seq(
          StdLib.let("item", CoreLib.entity(StdLib.var("itemId"))),
          StdLib.if(
            StdLib.var("item"),
            StdLib.seq(
              StdLib.let(
                "itemCap",
                KernelLib.getCapability(
                  "entity.control",
                  ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.var("item"), "id")]),
                ),
              ),
              CoreLib.destroy(StdLib.var("itemCap"), StdLib.var("item")),
            ),
          ),
        ),
      ),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.this(), "id")]),
        ),
      ),
      CoreLib.destroy(StdLib.var("cap"), StdLib.this()),
    ),
  );

  // 8. Hotel Elevator & Floors

  // Elevator (Persistent)
  const elevatorId = createEntity(
    {
      name: "Hotel Elevator",
      location: hotelLobbyId,
      description:
        "A polished brass elevator. Buttons for floors 1-100. Type 'push <floor>' to select.",
      current_floor: 1,
    },
    entityBaseId,
  );

  createCapability(elevatorId, "sys.create", {});
  createCapability(elevatorId, "entity.control", { target_id: elevatorId });

  // Link Lobby -> Elevator
  createEntity(
    {
      name: "elevator",
      location: hotelLobbyId,
      direction: "elevator",
      destination_id: elevatorId,
    },
    exitPrototypeId,
  );

  // Wing Prototype (Ephemeral)
  const wingProtoId = createEntity(
    {
      name: "Wing Proto",
      location: voidId,
      description: "A long hallway lined with doors.",
    },
    entityBaseId,
  );

  // --- Elevator Verbs ---

  // push <floor>
  addVerb(
    elevatorId,
    "push",
    StdLib.seq(
      StdLib.let("floor", StdLib.arg(0)),
      ObjectLib.objSet(StdLib.this(), "current_floor", StdLib.var("floor")),
      CoreLib.setEntity(KernelLib.getCapability("entity.control"), StdLib.this()),
      CoreLib.call(
        StdLib.caller(),
        "tell",
        StringLib.strConcat("The elevator hums and moves to floor ", StdLib.var("floor"), "."),
      ),
    ),
  );

  // Furnishings Prototypes
  const bedProtoId = createEntity({
    name: "Comfy Bed",
    location: voidId,
    description: "A soft, inviting bed with crisp white linens.",
  });

  const lampProtoId = createEntity({
    name: "Brass Lamp",
    location: voidId,
    description: "A polished brass lamp casting a warm glow.",
  });

  const chairProtoId = createEntity({
    name: "Velvet Chair",
    location: voidId,
    description: "A plush red velvet armchair.",
  });

  // --- Wing Verbs ---

  // enter <room_number>
  addVerb(
    wingProtoId,
    "enter",
    StdLib.seq(
      StdLib.let("roomNum", StdLib.arg(0)),
      StdLib.let("valid", true),
      // Validate room number matches wing side
      StdLib.let("side", ObjectLib.objGet(StdLib.this(), "side")),
      StdLib.if(
        BooleanLib.eq(StdLib.var("side"), "West"),
        StdLib.if(
          BooleanLib.or(
            BooleanLib.lt(StdLib.var("roomNum"), 1),
            BooleanLib.gt(StdLib.var("roomNum"), 50),
          ),
          StdLib.seq(
            CoreLib.call(StdLib.caller(), "tell", "Room numbers in the West Wing are 1-50."),
            StdLib.set("valid", false),
          ),
        ),
      ),
      StdLib.if(
        BooleanLib.eq(StdLib.var("side"), "East"),
        StdLib.if(
          BooleanLib.or(
            BooleanLib.lt(StdLib.var("roomNum"), 51),
            BooleanLib.gt(StdLib.var("roomNum"), 99),
          ),
          StdLib.seq(
            CoreLib.call(StdLib.caller(), "tell", "Room numbers in the East Wing are 51-99."),
            StdLib.set("valid", false),
          ),
        ),
      ),
      // Execute if valid
      StdLib.if(
        StdLib.var("valid"),
        StdLib.seq(
          StdLib.let("createCap", KernelLib.getCapability("sys.create")),
          StdLib.let("roomData", ObjectLib.objNew()),
          ObjectLib.objSet(
            StdLib.var("roomData"),
            "name",
            StringLib.strConcat("Room ", StdLib.var("roomNum")),
          ),
          ObjectLib.objSet(StdLib.var("roomData"), "kind", "ROOM"),

          ObjectLib.objSet(StdLib.var("roomData"), "description", "A standard hotel room."),
          ObjectLib.objSet(
            StdLib.var("roomData"),
            "lobby_id",
            ObjectLib.objGet(StdLib.this(), "id"),
          ), // Return to THIS wing
          StdLib.let("roomId", CoreLib.create(StdLib.var("createCap"), StdLib.var("roomData"))),
          StdLib.let("roomFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("roomFilter"), "target_id", StdLib.var("roomId")),
          CoreLib.setPrototype(
            KernelLib.getCapability("entity.control", StdLib.var("roomFilter")),
            CoreLib.entity(StdLib.var("roomId")),
            hotelRoomProtoId,
          ),
          // Furnish the room
          StdLib.let("bedData", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("bedData"), "name", "Bed"),
          ObjectLib.objSet(StdLib.var("bedData"), "kind", "ITEM"),
          ObjectLib.objSet(StdLib.var("bedData"), "location", StdLib.var("roomId")),
          StdLib.let("bedId", CoreLib.create(StdLib.var("createCap"), StdLib.var("bedData"))),
          StdLib.let("bedFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("bedFilter"), "target_id", StdLib.var("bedId")),
          CoreLib.setPrototype(
            KernelLib.getCapability("entity.control", StdLib.var("bedFilter")),
            CoreLib.entity(StdLib.var("bedId")),
            bedProtoId,
          ),
          KernelLib.giveCapability(
            KernelLib.getCapability("entity.control", StdLib.var("bedFilter")),
            CoreLib.entity(StdLib.var("roomId")),
          ),
          StdLib.let("lampData", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("lampData"), "name", "Lamp"),
          ObjectLib.objSet(StdLib.var("lampData"), "kind", "ITEM"),
          ObjectLib.objSet(StdLib.var("lampData"), "location", StdLib.var("roomId")),
          StdLib.let("lampId", CoreLib.create(StdLib.var("createCap"), StdLib.var("lampData"))),
          StdLib.let("lampFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("lampFilter"), "target_id", StdLib.var("lampId")),
          CoreLib.setPrototype(
            KernelLib.getCapability("entity.control", StdLib.var("lampFilter")),
            CoreLib.entity(StdLib.var("lampId")),
            lampProtoId,
          ),
          KernelLib.giveCapability(
            KernelLib.getCapability("entity.control", StdLib.var("lampFilter")),
            CoreLib.entity(StdLib.var("roomId")),
          ),
          StdLib.let("chairData", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("chairData"), "name", "Chair"),
          ObjectLib.objSet(StdLib.var("chairData"), "kind", "ITEM"),
          ObjectLib.objSet(StdLib.var("chairData"), "location", StdLib.var("roomId")),
          StdLib.let("chairId", CoreLib.create(StdLib.var("createCap"), StdLib.var("chairData"))),
          StdLib.let("chairFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("chairFilter"), "target_id", StdLib.var("chairId")),
          CoreLib.setPrototype(
            KernelLib.getCapability("entity.control", StdLib.var("chairFilter")),
            CoreLib.entity(StdLib.var("chairId")),
            chairProtoId,
          ),
          KernelLib.giveCapability(
            KernelLib.getCapability("entity.control", StdLib.var("chairFilter")),
            CoreLib.entity(StdLib.var("roomId")),
          ),

          // Update Room Contents
          StdLib.let("room", CoreLib.entity(StdLib.var("roomId"))),
          StdLib.let("contents", ListLib.listNew()),
          ListLib.listPush(StdLib.var("contents"), StdLib.var("bedId")),
          ListLib.listPush(StdLib.var("contents"), StdLib.var("lampId")),
          ListLib.listPush(StdLib.var("contents"), StdLib.var("chairId")),
          ObjectLib.objSet(StdLib.var("room"), "contents", StdLib.var("contents")),
          CoreLib.setEntity(
            KernelLib.getCapability("entity.control", StdLib.var("roomFilter")),
            StdLib.var("room"),
          ),

          KernelLib.giveCapability(
            KernelLib.delegate(
              KernelLib.getCapability("entity.control", StdLib.var("roomFilter")),
              {},
            ),
            CoreLib.entity(StdLib.var("roomId")),
          ),

          CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("roomId"))),
          CoreLib.call(
            StdLib.caller(),
            "tell",
            StringLib.strConcat("You enter Room ", StdLib.var("roomNum"), "."),
          ),
        ),
      ),
    ),
  );

  // 9. NPCs

  // Receptionist (in Hotel Lobby)
  const receptionistId = createEntity({
    name: "Receptionist",
    location: hotelLobbyId,
    description: "A friendly receptionist standing behind the desk.",
  });

  addVerb(
    receptionistId,
    "on_hear",
    StdLib.seq(
      StdLib.let("msg", StdLib.arg(0)),
      StdLib.let("speakerId", StdLib.arg(1)),
      // Simple heuristics
      StdLib.if(
        StringLib.strIncludes(StringLib.strLower(StdLib.var("msg")), "room"),
        CoreLib.call(
          StdLib.caller(),
          "say",
          "We have lovely rooms available on floors 1-100. Just use the elevator!",
        ),
      ),
      StdLib.if(
        StringLib.strIncludes(StringLib.strLower(StdLib.var("msg")), "hello"),
        CoreLib.call(StdLib.caller(), "say", "Welcome to the Grand Hotel! How may I help you?"),
      ),
    ),
  );

  // Golem (in Void for now, maybe move to lobby?)
  // Let's put the Golem in the Hotel Lobby too for testing
  const golemId = createEntity({
    name: "Stone Golem",
    location: hotelLobbyId,
    description: "A massive stone golem. It seems to be listening.",
  });

  addVerb(
    golemId,
    "on_hear",
    StdLib.seq(
      StdLib.let("msg", StdLib.arg(0)),
      StdLib.let("type", StdLib.arg(2)),
      StdLib.if(
        BooleanLib.eq(StdLib.var("type"), "tell"),
        CoreLib.call(
          StdLib.caller(),
          "say",
          StringLib.strConcat("Golem echoes: ", StdLib.var("msg")),
        ),
      ),
    ),
  );
}
