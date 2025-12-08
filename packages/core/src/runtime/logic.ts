import { type Capability, type ScriptContext, ScriptError } from "@viwo/scripting";
import { checkCapability } from "./utils";
import { deleteEntity } from "../repo";

export function destroyEntityLogic(
  capability: Capability | null,
  targetId: number,
  ctx: ScriptContext,
) {
  if (!capability) {
    throw new ScriptError("destroy: expected capability");
  }
  checkCapability(
    capability,
    ctx.this.id,
    "entity.control",
    (params) => params["target_id"] === targetId,
  );
  deleteEntity(targetId);
}
