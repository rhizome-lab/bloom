// import { type Entity } from "@viwo/shared/jsonrpc";
// import { WrappedEntity } from "./wrappers";

import { hydrateCapability } from "./capabilities";

export function hydrate(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // Hydrate Capability
  // Check for signature { id, type, owner_id|ownerId } or { id, __brand: "Capability" }
  const cap = value as any;
  if (
    "id" in cap &&
    "type" in cap &&
    ("owner_id" in cap || "ownerId" in cap || cap.__brand === "Capability")
  ) {
    return hydrateCapability({
      id: cap.id,
      ownerId: cap.ownerId ?? cap.owner_id,
      params: cap.params ?? {},
      type: cap.type,
    });
  }

  // Hydrate Entity
  // Check signature { id: number, props: ... }
  if ("id" in value && typeof (value as any).id === "number") {
    return value;
  }

  return value;
}
