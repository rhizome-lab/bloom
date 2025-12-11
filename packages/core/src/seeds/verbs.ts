// These imports pull in type declarations for opcodes.
// oxlint-disable-next-line no-unassigned-import
import "../generated_types";
// oxlint-disable-next-line no-unassigned-import
import "../plugin_types";

// system/bot verbs moved to seeds/definitions/System.ts

// entity_base verbs moved to seeds/definitions/EntityBase.ts

// player verbs moved to seeds/definitions/Player.ts

// This file is now empty as all verbs have been migrated to class definitions in seeds/definitions/

export function player_quest_start() {
  const questId = std.arg<number>(0);
  const player = std.caller();

  if (!questId) {
    send("message", "Quest ID required.");
    return;
  }

  // Need control to update player state
  let controlCap = get_capability("entity.control", { target_id: player.id });
  if (!controlCap) {
    controlCap = get_capability("entity.control", { "*": true });
  }

  if (!controlCap) {
    send("message", "Permission denied: Cannot modify player quest state.");
    return;
  }

  // Fetch quest structure
  const questEnt = entity(questId);
  const structure = call(questEnt, "get_structure") as any;
  if (!structure) {
    send("message", "Invalid quest: No structure defined.");
    return;
  }

  const quests = (player["quests"] as Record<string, any>) ?? {};

  if (quests[String(questId)] && quests[String(questId)].status !== "completed") {
    send("message", "Quest already started.");
    return;
  }

  // Initialize state
  const questState: any = {
    started_at: time.to_timestamp(time.now()),
    status: "active",
    tasks: {},
  };

  // Recursive helper to initialize tasks
  // We can't define recursive functions inside easily without `function` keyword which might not be captured well if simple lambdas.
  // We'll iterate or just activate the root.
  // Actually, we just need to activate the root node.
  const rootId = structure.id;
  questState.tasks[rootId] = { status: "active" };
  quests[String(questId)] = questState;
  controlCap.update(player.id, { quests });
  send("message", `Quest Started: ${structure.description || questEnt["name"]}`);

  // If root is a container (parallel/sequence) checking its children might happen in update loop
  // but for start we just set root active.
  // If root is sequence, we might need to activate first child?
  // Yes, logic: if active node is sequence, activate first child.
  // If active node is parallel, activate all children.
  call(player, "quest_update", questId, rootId, "active");
}

export function player_quest_update() {
  const questId = std.arg<number>(0);
  const taskId = std.arg<string>(1);
  const status = std.arg<string>(2); // "active" or "completed"
  const player = std.caller();

  let controlCap = get_capability("entity.control", { target_id: player.id });
  if (!controlCap) {
    controlCap = get_capability("entity.control", { "*": true });
  }

  if (!controlCap) {
    return;
  } // Silent fail or error?

  const quests = (player["quests"] as Record<string, any>) ?? {};
  const qState = quests[String(questId)];
  if (!qState || qState.status !== "active") {
    return;
  }

  // Update local task status
  // If status is "active", we might need to cascade down
  // If status is "completed", we might need to cascade up

  const currentTaskState = qState.tasks[taskId] || {};

  // Prevent redundant updates
  if (currentTaskState.status === status) {
    return;
  }

  qState.tasks[taskId] = { ...currentTaskState, status: status };

  // Save state before recursion to ensure consistency?
  // Actually recursion calls 'quest_update' which fetches state again.
  // So we MUST save state now.
  controlCap.update(player.id, { quests });

  const questEnt = entity(questId);
  const structure = call(questEnt, "get_structure") as any;

  // Helper to find node helper
  // Only works if we traverse or have a flat map.
  // Let's assume structure has a flat map or we traverse.
  // Parsing tree every time is expensive.
  // Better: Quest Entity provides "get_node(id)".
  const node = call(questEnt, "get_node", taskId) as any;

  if (!node) {
    return;
  }

  if (status === "active") {
    // Cascade Down
    if (node.type === "sequence") {
      // Activate first child
      if (node.children && list.len(node.children) > 0) {
        call(player, "quest_update", questId, node.children[0], "active");
      } else {
        // Empty sequence? Complete it.
        call(player, "quest_update", questId, taskId, "completed");
      }
    } else if (node.type === "parallel_all" || node.type === "parallel_any") {
      // Activate all children
      if (node.children) {
        for (const childId of node.children) {
          call(player, "quest_update", questId, childId, "active");
        }
      }
    }
  } else if (status === "completed") {
    // Check Parent
    // We need parent ID. Node should have it? Or we search.
    // Let's assume node has parent_id, or we pass it?
    // Adding parent_id to node structure is smart.
    if (node.parent_id) {
      const parentNode = call(questEnt, "get_node", node.parent_id) as any;
      if (parentNode) {
        if (parentNode.type === "sequence") {
          // Find next sibling
          // Index of current
          let nextChildId;
          let found = false;
          for (const childId of parentNode.children) {
            if (found) {
              nextChildId = childId;
              break;
            }
            if (childId === taskId) {
              found = true;
            }
          }

          if (nextChildId) {
            call(player, "quest_update", questId, nextChildId, "active");
          } else {
            // Sequence complete
            call(player, "quest_update", questId, parentNode.id, "completed");
          }
        } else if (parentNode.type === "parallel_all") {
          // Check if all children completed
          let allComplete = true;
          // We need to fetch updated state
          // Since we are continuously calling, we should re-fetch 'quests' inside loop if strict consistency needed,
          // but 'player' is passed by reference? No, it's an object.
          // In ViwoScript 'player' is a handle? No, 'caller()' returns entity snapshot?
          // Usually 'caller()' returns current entity state.
          // However, inside this function we modified 'player["quests"]' and saved it.
          // But if we recursed, the inner calls modified it too.
          // So 'quests' variable here is STALE after inner calls.
          // We must re-read 'player' state for checking siblings.

          const freshPlayer = std.caller();
          const freshQuests = freshPlayer["quests"] as any;
          const freshQState = freshQuests[String(questId)];

          for (const childId of parentNode.children) {
            const childTask = freshQState.tasks[childId];
            if (!childTask || childTask.status !== "completed") {
              allComplete = false;
              break;
            }
          }

          if (allComplete) {
            call(player, "quest_update", questId, parentNode.id, "completed");
          }
        } else if (parentNode.type === "parallel_any") {
          // One done, all done
          call(player, "quest_update", questId, parentNode.id, "completed");
        }
      }
    } else {
      // Root complete?
      if (taskId === structure.id) {
        qState.status = "completed";
        qState.completed_at = time.to_timestamp(time.now());
        controlCap.update(player.id, { quests }); // Need to save final Quest Level status
        send("message", `Quest Completed: ${structure.description || questEnt["name"]}!`);
      }
    }
  }
}

export function player_quest_log() {
  const player = std.caller();
  const quests = (player["quests"] as Record<string, any>) ?? {};

  if (list.len(obj.keys(quests)) === 0) {
    send("message", "No active quests.");
    return;
  }

  let output = "Quest Log:\n";

  for (const qId of obj.keys(quests)) {
    const qState = quests[qId];
    if (qState.status !== "active") {
      continue;
    } // Only show active? Or completed too?

    const questEnt = entity(std.int(qId));
    const structure = call(questEnt, "get_structure") as any;

    output = str.concat(output, `\n[${questEnt["name"]}]\n`);

    // DFS for print
    // recursive print?
    // We'll define a lambda/helper if possible or just iterative stack
    const stack: any[] = [{ depth: 0, id: structure.id }];

    // We need to print in order. Stack is LIFO.
    // If we want preorder traversal (Root -> Child 1 -> Child 2), we push children in reverse order.

    while (list.len(stack) > 0) {
      const item = list.pop(stack);
      const node = call(questEnt, "get_node", item.id) as any;
      const taskState = qState.tasks[item.id] || { status: "locked" };

      let indent = "";
      let idx = 0;
      while (idx < item.depth) {
        indent = str.concat(indent, "  ");
        idx += 1;
      }

      let mark = "[ ]";
      if (taskState.status === "completed") {
        mark = "[x]";
      } else if (taskState.status === "active") {
        mark = "[>]";
      }
      // Locked items generally shouldn't be shown if they are far down, but let's show them as locked.

      output = str.concat(output, `${indent}${mark} ${node.description}\n`);

      if (node.children) {
        // Push reverse
        let idx = list.len(node.children) - 1;
        while (idx >= 0) {
          list.push(stack, { depth: item.depth + 1, id: node.children[idx] });
          idx -= 1;
        }
      }
    }
  }

  call(player, "tell", output);
}

// Quest Entity Verbs

export function quest_get_structure(this: Entity) {
  return this["structure"];
}

export function quest_get_node(this: Entity) {
  const nodeId = std.arg<string>(0);
  const map = this["nodes_map"] as Record<string, any>;
  return map ? map[nodeId] : undefined;
}

export function quest_test(this: Entity) {
  const player = std.arg<Entity>(0);
  const questId = std.arg<number>(1);

  if (!player || !questId) {
    send("message", "Usage: test <player> <quest_id>");
    return;
  }

  send("message", "--- Quest Verification Start ---");

  // 1. Start Quest
  call(player, "quest_start", questId);

  // 2. Check State (Indirectly via log or peeking prop)
  // We can peek prop if we have sudo/control, or just trust logs.
  // Let's print log.
  call(player, "quest_log");

  // 3. Complete Task 1 (Get Chips)
  send("message", "--- Completing 'get_chips' ---");
  call(player, "quest_update", questId, "get_chips", "completed");
  call(player, "quest_log");

  // 4. Complete Task 2 (Get Drinks)
  send("message", "--- Completing 'get_drinks' ---");
  call(player, "quest_update", questId, "get_drinks", "completed");
  // This should complete "gather_supplies" (Parallel All) and activate "invite_friends"
  call(player, "quest_log");

  // 5. Complete Task 3 (Invite Friends)
  send("message", "--- Completing 'invite_friends' ---");
  call(player, "quest_update", questId, "invite_friends", "completed");
  // This should complete "party_prep" (Root)

  // Final Log
  call(player, "quest_log");

  send("message", "--- Quest Verification End ---");
}

export function golem_on_hear() {
  const speaker = std.arg<Entity>(0);
  const message = std.arg<string>(1);
  if (str.includes(str.lower(message), "hello")) {
    call(speaker, "tell", "GREETINGS. I AM GOLEM.");
  }
}
