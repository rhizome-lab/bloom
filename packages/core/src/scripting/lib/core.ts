import {
  evaluate,
  evaluateTarget,
  executeLambda,
  ScriptContext,
  ScriptError,
} from "../interpreter";
import { checkPermission } from "../../permissions";
import { updateEntity } from "../../repo";
import { config } from "../config";

export const CoreLibrary: Record<
  string,
  (args: any[], ctx: ScriptContext) => Promise<any>
> = {
  // Control Flow
  seq: async (args, ctx) => {
    let lastResult = null;
    for (const step of args) {
      lastResult = await evaluate(step, ctx);
    }
    return lastResult;
  },
  do: async (args, ctx) => {
    let lastResult = null;
    for (const step of args) {
      lastResult = await evaluate(step, ctx);
    }
    return lastResult;
  },
  if: async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length < 2 || args.length > 3) {
        throw new ScriptError("if requires 2 or 3 arguments");
      }
    }
    const [cond, thenBranch, elseBranch] = args;
    if (await evaluate(cond, ctx)) {
      return await evaluate(thenBranch, ctx);
    } else if (elseBranch) {
      return await evaluate(elseBranch, ctx);
    }
    return null;
  },
  while: async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("while requires 2 arguments");
      }
    }
    const [cond, body] = args;
    let result = null;
    while (await evaluate(cond, ctx)) {
      result = await evaluate(body, ctx);
    }
    return result;
  },
  for: async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 3) {
        throw new ScriptError("for requires 3 arguments");
      }
    }
    const [varName, listExpr, body] = args;
    const list = await evaluate(listExpr, ctx);
    if (!Array.isArray(list)) return null;

    let lastResult = null;
    for (const item of list) {
      // Set loop variable
      ctx.vars = ctx.vars || {};
      ctx.vars[varName] = item;
      lastResult = await evaluate(body, ctx);
    }
    return lastResult;
  },
  return: async (args, ctx) => {
    return await evaluate(args[0], ctx);
  },
  list: async (args, ctx) => {
    const result = [];
    for (const arg of args) {
      result.push(await evaluate(arg, ctx));
    }
    return result;
  },

  // Variables
  let: async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("let requires 2 arguments");
      }
    }
    const [name, val] = args;
    const value = await evaluate(val, ctx);
    ctx.vars = ctx.vars || {};
    ctx.vars[name] = value;
    return value;
  },
  var: async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("var requires 1 argument");
      }
    }
    const [name] = args;
    return ctx.vars?.[name] ?? null;
  },
  set: async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("set requires 2 arguments");
      }
    }
    const [name, val] = args;
    const value = await evaluate(val, ctx);
    if (ctx.vars && name in ctx.vars) {
      ctx.vars[name] = value;
    }
    return value;
  },

  // Comparison
  "==": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) === (await evaluate(b, ctx));
  },
  "!=": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) !== (await evaluate(b, ctx));
  },
  "<": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) < (await evaluate(b, ctx));
  },
  ">": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) > (await evaluate(b, ctx));
  },
  "<=": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) <= (await evaluate(b, ctx));
  },
  ">=": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) >= (await evaluate(b, ctx));
  },

  // Arithmetic
  "+": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("+ requires 2 arguments");
      }
    }
    const [a, b] = args;
    return (await evaluate(a, ctx)) + (await evaluate(b, ctx));
  },
  "-": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) - (await evaluate(b, ctx));
  },
  "*": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) * (await evaluate(b, ctx));
  },
  "/": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) / (await evaluate(b, ctx));
  },
  "%": async (args, ctx) => {
    const [a, b] = args;
    return (await evaluate(a, ctx)) % (await evaluate(b, ctx));
  },
  "^": async (args, ctx) => {
    const [a, b] = args;
    return Math.pow(await evaluate(a, ctx), await evaluate(b, ctx));
  },

  // Logic
  and: async (args, ctx) => {
    for (const arg of args) {
      if (!(await evaluate(arg, ctx))) return false;
    }
    return true;
  },
  or: async (args, ctx) => {
    for (const arg of args) {
      if (await evaluate(arg, ctx)) return true;
    }
    return false;
  },
  not: async (args, ctx) => {
    return !(await evaluate(args[0], ctx));
  },

  // System
  log: async (args, ctx) => {
    const msg = await evaluate(args[0], ctx);
    console.log(msg);
    return null;
  },
  arg: async (args, ctx) => {
    const [index] = args;
    return ctx.args?.[index] ?? null;
  },
  args: async (_args, ctx) => {
    return ctx.args ?? [];
  },
  random: async (args, ctx) => {
    // random(min, max) or random() -> 0..1
    if (args.length === 0) return Math.random();
    const min = await evaluate(args[0], ctx);
    const max = await evaluate(args[1], ctx);
    if (typeof min === "number" && typeof max === "number") {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.random();
  },
  warn: async (args, ctx) => {
    const [msg] = args;
    const text = await evaluate(msg, ctx);
    if (ctx.warnings) {
      ctx.warnings.push(String(text));
    }
    return null;
  },
  throw: async (args, ctx) => {
    const [msg] = args;
    throw new ScriptError(await evaluate(msg, ctx));
  },
  try: async (args, ctx) => {
    const [tryBlock, errorVar, catchBlock] = args;
    try {
      return await evaluate(tryBlock, ctx);
    } catch (e: any) {
      if (catchBlock) {
        if (errorVar && typeof errorVar === "string") {
          if (!ctx.vars) ctx.vars = {};
          ctx.vars[errorVar] = e.message || String(e);
        }
        return await evaluate(catchBlock, ctx);
      }
      return null;
    }
  },

  // Entity Interaction
  tell: async (args, ctx) => {
    const [targetExpr, msgExpr] = args;
    const msg = await evaluate(msgExpr, ctx);
    const target = await evaluateTarget(targetExpr, ctx);

    if (!target) return null;

    // If target is caller (resolved), send to socket
    if (target.id === ctx.caller.id) {
      if (ctx.sys?.send) {
        ctx.sys.send({ type: "message", text: msg });
      }
      return true;
    }

    // Otherwise, trigger on_hear and notify caller
    if (ctx.sys?.triggerEvent) {
      // Notify caller
      if (ctx.sys.send) {
        ctx.sys.send({
          type: "message",
          text: `You tell ${target.name}: "${msg}"`,
        });
      }

      // Trigger on_hear
      // We use sys.call if available to target the specific entity
      if (ctx.sys.call) {
        try {
          await ctx.sys.call(
            ctx.caller,
            target.id,
            "on_hear",
            [msg, ctx.caller.id, "tell"],
            ctx.warnings,
          );
        } catch {
          // Ignore if verb not found
        }
      }
    }
    return true;
  },

  move: async (args, ctx) => {
    const [targetExpr, destExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const dest = await evaluateTarget(destExpr, ctx);

    if (!target || !dest) return null;

    if (!checkPermission(ctx.caller, target, "edit")) {
      throw new ScriptError(`Permission denied: cannot move ${target.id}`);
    }

    if (ctx.sys?.move) {
      // Check enter permission on destination
      if (!checkPermission(ctx.caller, dest, "enter")) {
        throw new ScriptError(`Permission denied: cannot enter ${dest.id}`);
      }
      ctx.sys.move(target.id, dest.id);
    }
    return true;
  },

  create: async (args, ctx) => {
    if (args.length === 1) {
      const [dataExpr] = args;
      const data = await evaluate(dataExpr, ctx);
      if (ctx.sys?.create) {
        return ctx.sys.create(data);
      }
    } else {
      const [kindExpr, nameExpr, propsExpr, locExpr] = args;
      const kind = await evaluate(kindExpr, ctx);
      const name = await evaluate(nameExpr, ctx);
      const props = propsExpr ? await evaluate(propsExpr, ctx) : {};
      const location_id = locExpr ? await evaluate(locExpr, ctx) : undefined;

      if (ctx.sys?.create) {
        return ctx.sys.create({ kind, name, props, location_id });
      }
    }
    return null;
  },

  destroy: async (args, ctx) => {
    const [targetExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);

    if (!target) return null;

    if (!checkPermission(ctx.caller, target, "edit")) {
      throw new ScriptError(`Permission denied: cannot destroy ${target.id}`);
    }

    if (ctx.sys?.destroy) {
      ctx.sys.destroy(target.id);
    }
    return true;
  },

  give: async (args, ctx) => {
    const [targetExpr, destExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const dest = await evaluateTarget(destExpr, ctx);

    if (!target || !dest) return null;

    // Check permission: caller must own target
    if (target.owner_id !== ctx.caller.id) {
      throw new ScriptError(`Permission denied: you do not own ${target.id}`);
    }

    if (ctx.sys?.give) {
      // Transfer ownership to destination's owner
      // If destination has no owner, check if destination is an ACTOR.
      // If ACTOR, they become owner. If not, clear owner (public).
      let newOwnerId = dest.owner_id;
      if (!newOwnerId) {
        if (dest.kind === "ACTOR") {
          newOwnerId = dest.id;
        } else {
          newOwnerId = 0; // No owner
        }
      }
      ctx.sys.give(target.id, dest.id, newOwnerId);
    }
    return true;
  },

  // Properties
  prop: async (args, ctx) => {
    const [targetExpr, keyExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const key = await evaluate(keyExpr, ctx);

    if (!target || typeof key !== "string") return null;

    // Check permission
    if (!checkPermission(ctx.caller, target, "view")) {
      throw new ScriptError(`Permission denied: cannot view ${target.id}`);
    }

    if (key in target) {
      return (target as any)[key];
    }
    return target.props[key];
  },

  "prop.set": async (args, ctx) => {
    const [targetExpr, keyExpr, valExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const key = await evaluate(keyExpr, ctx);
    const val = await evaluate(valExpr, ctx);

    if (!target || typeof key !== "string") return null;

    // Check permission
    if (!checkPermission(ctx.caller, target, "edit")) {
      throw new ScriptError(`Permission denied: cannot edit ${target.id}`);
    }

    const newProps = { ...target.props, [key]: val };
    updateEntity(target.id, { props: newProps });
    return val;
  },

  lambda: async (args, ctx) => {
    const [argNames, body] = args;
    return {
      type: "lambda",
      args: argNames,
      body,
      closure: { ...ctx.vars },
    };
  },
  apply: async (args, ctx) => {
    const [funcExpr, ...argExprs] = args;
    const func = await evaluate(funcExpr, ctx);

    if (!func || func.type !== "lambda") return null;

    const evaluatedArgs = [];
    for (const arg of argExprs) {
      evaluatedArgs.push(await evaluate(arg, ctx));
    }

    // Create new context
    const newVars = { ...func.closure };
    // Bind arguments
    for (let i = 0; i < func.args.length; i++) {
      newVars[func.args[i]] = evaluatedArgs[i];
    }

    return await evaluate(func.body, {
      ...ctx,
      vars: newVars,
    });
  },
  call: async (args, ctx) => {
    const [targetExpr, verbExpr, ...callArgs] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const verb = await evaluate(verbExpr, ctx);

    // Evaluate arguments
    const evaluatedArgs = [];
    for (const arg of callArgs) {
      evaluatedArgs.push(await evaluate(arg, ctx));
    }

    if (!target || typeof verb !== "string") return null;

    if (ctx.sys?.call) {
      return await ctx.sys.call(
        ctx.caller,
        target.id,
        verb,
        evaluatedArgs,
        ctx.warnings,
      );
    }
    return null;
  },
  schedule: async (args, ctx) => {
    const [verbExpr, argsExpr, delayExpr] = args;
    const verb = await evaluate(verbExpr, ctx);
    const callArgs = await evaluate(argsExpr, ctx);
    const delay = await evaluate(delayExpr, ctx);

    if (
      typeof verb !== "string" ||
      !Array.isArray(callArgs) ||
      typeof delay !== "number"
    )
      return null;

    if (ctx.sys?.schedule) {
      ctx.sys.schedule(ctx.this.id, verb, callArgs, delay);
    }
    return true;
  },
  broadcast: async (args, ctx) => {
    const [msgExpr, locExpr] = args;
    const msg = await evaluate(msgExpr, ctx);
    const loc = locExpr ? await evaluate(locExpr, ctx) : undefined;

    if (ctx.sys?.broadcast) {
      ctx.sys.broadcast(msg, loc);
    }
    return true;
  },
  "sys.send_room": async (args, ctx) => {
    const [roomIdExpr] = args;
    const roomId = roomIdExpr
      ? await evaluate(roomIdExpr, ctx)
      : ctx.caller.location_id;

    if (typeof roomId !== "number") return null;

    if (ctx.sys?.sendRoom) {
      ctx.sys.sendRoom(roomId);
    }
    return true;
  },
  "sys.send_inventory": async (args, ctx) => {
    const [playerIdExpr] = args;
    const playerId = playerIdExpr
      ? await evaluate(playerIdExpr, ctx)
      : ctx.caller.id;

    if (typeof playerId !== "number") return null;

    if (ctx.sys?.sendInventory) {
      ctx.sys.sendInventory(playerId);
    }
    return true;
  },
  "sys.send_item": async (args, ctx) => {
    const [itemIdExpr] = args;
    const itemId = itemIdExpr ? await evaluate(itemIdExpr, ctx) : undefined;

    if (typeof itemId !== "number") return null;

    if (ctx.sys?.sendItem) {
      ctx.sys.sendItem(itemId);
    }
    return true;
  },
  "world.find": async (args, ctx) => {
    const [nameExpr] = args;
    const name = await evaluate(nameExpr, ctx);
    if (typeof name !== "string") return null;

    // evaluateTarget handles "me", "here", and name lookup in room/inventory
    const target = await evaluateTarget(name, ctx);
    return target ? target.id : null;
  },
  "sys.can_edit": async (args, ctx) => {
    const [entityIdExpr] = args;
    const entityId = await evaluate(entityIdExpr, ctx);
    if (typeof entityId !== "number") return false;

    if (ctx.sys?.canEdit) {
      return ctx.sys.canEdit(ctx.caller.id, entityId);
    }
    return false;
  },
  print: async (args, ctx) => {
    const [msgExpr] = args;
    const msg = await evaluate(msgExpr, ctx);
    if (typeof msg !== "string") return null;
    if (ctx.sys?.send) {
      ctx.sys.send({ type: "message", text: msg });
    }
    return true;
  },
  say: async (args, ctx) => {
    const [msgExpr] = args;
    const msg = await evaluate(msgExpr, ctx);

    if (typeof msg !== "string") return null;

    if (ctx.sys?.broadcast) {
      // Broadcast to room
      ctx.sys.broadcast(
        `${ctx.caller.name} says: "${msg}"`,
        ctx.caller.location_id || undefined,
      );
    }

    if (ctx.sys?.triggerEvent && ctx.caller.location_id) {
      await ctx.sys.triggerEvent(
        "on_hear",
        ctx.caller.location_id,
        [msg, ctx.caller.id, "say"],
        ctx.caller.id, // Exclude speaker
      );
    }
    return true;
  },
  // Data Structures
  object: async (args, ctx) => {
    // args: [key1, val1, key2, val2, ...]
    const obj: Record<string, any> = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = await evaluate(args[i], ctx);
      const val = await evaluate(args[i + 1], ctx);
      if (typeof key === "string") {
        obj[key] = val;
      }
    }
    return obj;
  },
  map: async (args, ctx) => {
    const [listExpr, funcExpr] = args;
    const list = await evaluate(listExpr, ctx);
    const func = await evaluate(funcExpr, ctx);

    if (!Array.isArray(list) || !func || func.type !== "lambda") return [];

    const result = [];
    for (const item of list) {
      // Execute lambda for each item
      const res = await executeLambda(func, [item], ctx);
      result.push(res);
    }
    return result;
  },

  // Entity Introspection
  contents: async (args, ctx) => {
    const [containerExpr] = args;
    const container = await evaluateTarget(containerExpr, ctx);
    if (!container) return [];

    if (ctx.sys?.getContents) {
      return ctx.sys.getContents(container.id);
    }
    return [];
  },
  verbs: async (args, ctx) => {
    const [entityExpr] = args;
    const entity = await evaluateTarget(entityExpr, ctx);
    if (!entity) return [];

    if (ctx.sys?.getVerbs) {
      const verbs = await ctx.sys.getVerbs(entity.id);
      return verbs.map((v: any) => v.name);
    }
    return [];
  },
  entity: async (args, ctx) => {
    const [idExpr] = args;
    const id = await evaluate(idExpr, ctx);
    if (typeof id === "number" && ctx.sys?.getEntity) {
      return ctx.sys.getEntity(id);
    }
    return null;
  },
};
