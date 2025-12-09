import { type Capability, type ScriptContext, ScriptError } from "@viwo/scripting";
import { createCapability, createEntity } from "../repo";
import { checkCapability } from "./utils";

export function createEntityLogic(
  capability: Capability | null,
  data: object,
  ctx: ScriptContext,
): number {
  if (!capability) {
    throw new ScriptError("create: expected capability");
  }

  checkCapability(capability, ctx.this.id, "sys.create");

  const newId = createEntity(data as never);
  // Mint entity.control for the new entity and give to creator
  createCapability(ctx.this.id, "entity.control", { target_id: newId });
  return newId;
}
