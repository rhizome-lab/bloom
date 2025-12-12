import { ScriptError, defineFullOpcode } from "@viwo/scripting";
import { getCapabilitiesByType } from "../../repo";
import { hydrateCapability } from "../capabilities";

/**
 * Gets a capability of the specified type owned by the current entity.
 * Returns the first matching capability or throws if none found.
 */
export const get = defineFullOpcode<[string], any>("cap.get", {
  handler: ([type], ctx) => {
    const capabilities = getCapabilitiesByType(ctx.this.id, type);
    if (capabilities.length === 0) {
      throw new ScriptError(
        `cap.get: no capability of type '${type}' found for entity ${ctx.this.id}`,
      );
    }

    // Return the first matching capability
    const [cap] = capabilities;
    return hydrateCapability({
      id: cap.id,
      ownerId: cap.owner_id,
      params: cap.params,
      type: cap.type,
    });
  },
  metadata: {
    category: "capabilities",
    description: "Get capability by type",
    label: "Get Capability",
    parameters: [{ description: "The type of capability to get.", name: "type", type: "string" }],
    returnType: "Capability",
    slots: [{ name: "Type", type: "string" }],
  },
});

/**
 * Calls a method on a capability.
 * Uses std.callMethod under the hood to invoke the capability's method.
 */
export const call = defineFullOpcode<[any, string, ...unknown[]], any>("cap.call", {
  handler: async ([capability, method, ...args], ctx) => {
    // Verify it's a capability
    if (!capability || typeof capability !== "object" || capability.__brand !== "Capability") {
      throw new ScriptError("cap.call: first argument must be a capability");
    }

    // Get the method
    const fn = (capability as any)[method];
    if (typeof fn !== "function") {
      throw new ScriptError(`cap.call: method '${method}' not found on capability`);
    }

    // Call the method with the script context as the last argument
    return await fn.apply(capability, [...args, ctx]);
  },
  metadata: {
    category: "capabilities",
    description: "Call capability method",
    label: "Call Capability",
    parameters: [
      { description: "The capability to call.", name: "capability", type: "Capability" },
      { description: "The method name to call.", name: "method", type: "string" },
      { description: "Arguments to pass to the method.", name: "...args", type: "any[]" },
    ],
    returnType: "any",
    slots: [
      { name: "Capability", type: "block" },
      { name: "Method", type: "string" },
      { name: "Args...", type: "block" },
    ],
  },
});
