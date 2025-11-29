import { db } from "./db";

/**
 * Represents a game entity.
 * Everything in the game is an Entity (Room, Player, Item, Exit, etc.).
 */
export type Entity = {
  /** Unique ID of the entity */
  id: number;
  /** ID of the prototype this entity inherits from (hidden from public interface mostly) */
  // prototype_id: number | null;
  /**
   * Resolved properties (merged from prototype and instance).
   * Contains arbitrary game data like description, adjectives, custom_css.
   */
  [key: string]: any;
};

/**
 * Fetches an entity by ID, resolving its properties against its prototype.
 *
 * This performs a "deep resolve" where instance properties override prototype properties.
 *
 * @param id - The ID of the entity to fetch.
 * @returns The resolved Entity object or null if not found.
 */
export function getEntity(id: number): Entity | null {
  const row = db
    .query("SELECT id, prototype_id, props FROM entities WHERE id = ?")
    .get(id) as { id: number; prototype_id: number | null; props: string };

  if (!row) return null;

  let props = JSON.parse(row.props);

  // Recursive prototype resolution
  if (row.prototype_id) {
    const proto = getEntity(row.prototype_id);
    if (proto) {
      // Merge props: Instance overrides Prototype
      // We exclude 'id' from proto to avoid overwriting
      const { id: _, ...protoProps } = proto;
      props = { ...protoProps, ...props };
    }
  }

  return {
    id: row.id,
    ...props,
  };
}

/**
 * Creates a new entity in the database.
 *
 * @param props - The initial properties for the entity.
 * @param prototypeId - Optional prototype ID.
 * @returns The ID of the newly created entity.
 */
export function createEntity(
  props: Record<string, any>,
  prototypeId?: number,
): number {
  const result = db
    .query(
      "INSERT INTO entities (prototype_id, props) VALUES (?, ?) RETURNING id",
    )
    .get(prototypeId || null, JSON.stringify(props)) as { id: number };

  return result.id;
}

/**
 * Updates an existing entity.
 * Only provided fields will be updated.
 *
 * @param id - The ID of the entity to update.
 * @param props - The properties to update (merged with existing).
 */
export function updateEntity(id: number, props: Record<string, any>) {
  const row = db.query("SELECT props FROM entities WHERE id = ?").get(id) as {
    props: string;
  };
  if (!row) return;

  const currentProps = JSON.parse(row.props);
  const newProps = { ...currentProps, ...props };

  db.query("UPDATE entities SET props = ? WHERE id = ?").run(
    JSON.stringify(newProps),
    id,
  );
}

/**
 * Represents a scriptable action (verb) attached to an entity.
 */
export interface Verb {
  id: number;
  entity_id: number;
  /** The name of the verb (command) */
  name: string;
  /** The compiled S-expression code for the verb */
  code: unknown; // JSON
  /** Permission settings for the verb */
  permissions: Record<string, unknown>;
}

export function getVerbs(entityId: number): Verb[] {
  // Recursive function to collect verbs up the prototype chain
  const collectVerbs = (id: number, visited: Set<number>): Verb[] => {
    if (visited.has(id)) return [];
    visited.add(id);

    const rows = db
      .query("SELECT * FROM verbs WHERE entity_id = ?")
      .all(id) as readonly (Omit<Verb, "code" | "permissions"> & {
      code: string;
      permissions: string;
    })[];

    const verbs = rows.map((r) => ({
      ...r,
      code: JSON.parse(r.code),
      permissions: JSON.parse(r.permissions),
    }));

    // Check prototype
    const entity = db
      .query("SELECT prototype_id FROM entities WHERE id = ?")
      .get(id) as { prototype_id: number | null };

    if (entity && entity.prototype_id) {
      const protoVerbs = collectVerbs(entity.prototype_id, visited);
      // Merge, keeping the child's verb if names collide
      const verbNames = new Set(verbs.map((v) => v.name));
      for (const pv of protoVerbs) {
        if (!verbNames.has(pv.name)) {
          verbs.push(pv);
        }
      }
    }

    return verbs;
  };

  return collectVerbs(entityId, new Set());
}

// Recursive lookup
function lookupVerb(
  id: number,
  name: string,
  visited: Set<number>,
): Verb | null {
  if (visited.has(id)) return null;
  visited.add(id);

  const row = db
    .query("SELECT * FROM verbs WHERE entity_id = ? AND name = ?")
    .get(id, name) as any;

  if (row) {
    return {
      ...row,
      code: JSON.parse(row.code),
      permissions: JSON.parse(row.permissions),
    };
  }

  // Check prototype
  const entity = db
    .query("SELECT prototype_id FROM entities WHERE id = ?")
    .get(id) as { prototype_id: number | null };

  if (entity?.prototype_id) {
    return lookupVerb(entity.prototype_id, name, visited);
  }

  return null;
}

export function getVerb(entityId: number, name: string): Verb | null {
  return lookupVerb(entityId, name, new Set());
}

export function addVerb(
  entityId: number,
  name: string,
  code: any,
  permissions: Record<string, any> = { call: "public" },
) {
  db.query(
    "INSERT INTO verbs (entity_id, name, code, permissions) VALUES (?, ?, ?, ?)",
  ).run(entityId, name, JSON.stringify(code), JSON.stringify(permissions));
}

export function updateVerb(
  id: number,
  code?: any,
  permissions?: Record<string, any>,
) {
  const updates: string[] = [];
  const params: any[] = [];

  if (code !== undefined) {
    updates.push("code = ?");
    params.push(JSON.stringify(code));
  }
  if (permissions !== undefined) {
    updates.push("permissions = ?");
    params.push(JSON.stringify(permissions));
  }

  if (updates.length > 0) {
    params.push(id);
    db.query(`UPDATE verbs SET ${updates.join(", ")} WHERE id = ?`).run(
      ...params,
    );
  }
}

export function deleteEntity(id: number) {
  const transaction = db.transaction(() => {
    db.query("DELETE FROM entity_data WHERE entity_id = ?").run(id);
    db.query("DELETE FROM verbs WHERE entity_id = ?").run(id);
    db.query("DELETE FROM entities WHERE id = ?").run(id);
  });
  transaction();
}
