import type { Entity } from "@viwo/shared/jsonrpc";
import { getVerb } from "../repo";

// import { callOpcode } from ...?

// For now, simpler wrapper
export class WrappedEntity {
  public readonly id: number;
  public readonly prototype_id: number | null;
  // Dynamic props
  [key: string]: any;

  constructor(data: Entity) {
    this.id = data.id;
    this.prototype_id = data.prototype_id;
    // Copy properties
    Object.assign(this, data);
  }

  // Example Method: Check if verb exists
  has_verb(name: string) {
    return !!getVerb(this.id, name);
  }

  // To ensure JSON serialization works (returns raw props)
  toJSON() {
    // Return plain object with properties
    return { ...this };
  }
}
