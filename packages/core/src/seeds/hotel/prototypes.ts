// oxlint-disable-next-line no-unassigned-import
import "../../generated_types";
// oxlint-disable-next-line no-unassigned-import
import "../../plugin_types";

export function room_on_enter(this: Entity) {
  const managerId = this["managed_by"] as number;
  if (managerId) {
    const manager = entity(managerId);
    call(manager, "room_occupied", this.id); // Valid future enhancement
  }
}

export function room_on_leave(this: Entity) {
  const managerId = this["managed_by"] as number;
  if (managerId) {
    // Uncomment when room_vacated is implemented
    // const _manager = entity(managerId);
    // call(manager, "room_vacated", this.id);
  }
}
