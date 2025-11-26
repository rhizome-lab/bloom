import { Entity, updateEntity } from "../repo";
import { checkPermission } from "../permissions";

export type ScriptContext = {
  caller: Entity;
  this: Entity;
  args: any[];
  sys?: {
    move: (id: number, dest: number) => void;
    create: (data: any) => number;
    send: (msg: any) => void;
  };
};

export class ScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScriptError";
  }
}

const OPS: Record<string, (args: any[], ctx: ScriptContext) => Promise<any>> = {
  // Control Flow
  seq: async (args, ctx) => {
    let lastResult = null;
    for (const step of args) {
      lastResult = await evaluate(step, ctx);
    }
    return lastResult;
  },
  if: async (args, ctx) => {
    const [cond, thenBranch, elseBranch] = args;
    const condResult = await evaluate(cond, ctx);
    if (condResult) {
      return await evaluate(thenBranch, ctx);
    } else if (elseBranch) {
      return await evaluate(elseBranch, ctx);
    }
    return null;
  },
  for: async () => {
    // Not implemented yet
    return null;
  },

  // Comparison
  "==": async (args, ctx) =>
    (await evaluate(args[0], ctx)) === (await evaluate(args[1], ctx)),
  "!=": async (args, ctx) =>
    (await evaluate(args[0], ctx)) !== (await evaluate(args[1], ctx)),
  ">": async (args, ctx) =>
    (await evaluate(args[0], ctx)) > (await evaluate(args[1], ctx)),
  "<": async (args, ctx) =>
    (await evaluate(args[0], ctx)) < (await evaluate(args[1], ctx)),
  ">=": async (args, ctx) =>
    (await evaluate(args[0], ctx)) >= (await evaluate(args[1], ctx)),
  "<=": async (args, ctx) =>
    (await evaluate(args[0], ctx)) <= (await evaluate(args[1], ctx)),

  // Logic
  and: async (args, ctx) =>
    (await evaluate(args[0], ctx)) && (await evaluate(args[1], ctx)),
  or: async (args, ctx) =>
    (await evaluate(args[0], ctx)) || (await evaluate(args[1], ctx)),
  not: async (args, ctx) => !(await evaluate(args[0], ctx)),

  // Math
  "+": async (args, ctx) =>
    (await evaluate(args[0], ctx)) + (await evaluate(args[1], ctx)),
  "-": async (args, ctx) =>
    (await evaluate(args[0], ctx)) - (await evaluate(args[1], ctx)),
  "*": async (args, ctx) =>
    (await evaluate(args[0], ctx)) * (await evaluate(args[1], ctx)),
  "/": async (args, ctx) =>
    (await evaluate(args[0], ctx)) / (await evaluate(args[1], ctx)),
  "%": async (args, ctx) =>
    (await evaluate(args[0], ctx)) % (await evaluate(args[1], ctx)),
  "^": async (args, ctx) =>
    Math.pow(await evaluate(args[0], ctx), await evaluate(args[1], ctx)),

  // Capabilities
  prop: async (args, ctx) => {
    const [targetExpr, keyExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const key = await evaluate(keyExpr, ctx);

    if (!target || typeof key !== "string") return null;

    // Check permission
    if (!checkPermission(ctx.caller, target, "view")) {
      throw new ScriptError(`Permission denied: cannot view ${target.id}`);
    }

    return target.props[key];
  },
  set: async (args, ctx) => {
    const [targetExpr, keyExpr, valExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    const key = await evaluate(keyExpr, ctx);
    const val = await evaluate(valExpr, ctx);

    if (!target || typeof key !== "string") return null;

    if (!checkPermission(ctx.caller, target, "edit")) {
      throw new ScriptError(`Permission denied: cannot edit ${target.id}`);
    }

    const newProps = { ...target.props, [key]: val };
    updateEntity(target.id, { props: newProps });
    return val;
  },
  tell: async (args, ctx) => {
    const [targetExpr, msgExpr] = args;
    // Special case: 'caller'
    if (targetExpr === "caller") {
      if (ctx.sys?.send) {
        ctx.sys.send({ type: "message", text: await evaluate(msgExpr, ctx) });
      }
      return;
    }
    return null;
  },
};

export async function evaluate(ast: any, ctx: ScriptContext): Promise<any> {
  if (!Array.isArray(ast)) {
    // Literals
    if (typeof ast === "string" && ast.startsWith("$")) {
      // Variable access (simple implementation for now)
      // We don't have local scope in this simple version yet,
      // but let's support args by index e.g. $0, $1
      const varName = ast.substring(1);
      const argIndex = parseInt(varName);
      if (!isNaN(argIndex)) {
        return ctx.args[argIndex];
      }
      // TODO: Implement local variables
      return null;
    }
    return ast;
  }

  if (ast.length === 0) return null;

  const [op, ...args] = ast;

  const handler = OPS[op];
  if (handler) {
    return await handler(args, ctx);
  }

  throw new ScriptError(`Unknown opcode: ${op}`);
}

async function evaluateTarget(
  expr: any,
  ctx: ScriptContext,
): Promise<Entity | null> {
  if (expr === "this") return ctx.this;
  if (expr === "caller") return ctx.caller;
  // TODO: Support resolving entity IDs or other references
  return null;
}
