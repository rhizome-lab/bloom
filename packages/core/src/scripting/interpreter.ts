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

  switch (op) {
    case "seq":
      let lastResult = null;
      for (const step of args) {
        lastResult = await evaluate(step, ctx);
      }
      return lastResult;

    case "if": {
      const [cond, thenBranch, elseBranch] = args;
      const condResult = await evaluate(cond, ctx);
      if (condResult) {
        return await evaluate(thenBranch, ctx);
      } else if (elseBranch) {
        return await evaluate(elseBranch, ctx);
      }
      return null;
    }

    case "for": {
      const [_varName, listExpr, _body] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) return null;

      // TODO: We need a way to pass the loop variable to the body.
      // For now, let's skip implementing 'for' with variables until we have a scope stack.
      // Or we can cheat and use a temporary property on 'this' or similar, but that's messy.
      // Let's implement a simple 'foreach' that assumes $item in body?
      // Or just implement 'while' for now.
      return null;
    }

    // Comparison
    case "==":
      return (await evaluate(args[0], ctx)) === (await evaluate(args[1], ctx));
    case "!=":
      return (await evaluate(args[0], ctx)) !== (await evaluate(args[1], ctx));
    case ">":
      return (await evaluate(args[0], ctx)) > (await evaluate(args[1], ctx));
    case "<":
      return (await evaluate(args[0], ctx)) < (await evaluate(args[1], ctx));
    case ">=":
      return (await evaluate(args[0], ctx)) >= (await evaluate(args[1], ctx));
    case "<=":
      return (await evaluate(args[0], ctx)) <= (await evaluate(args[1], ctx));

    // Logic
    case "and":
      return (await evaluate(args[0], ctx)) && (await evaluate(args[1], ctx));
    case "or":
      return (await evaluate(args[0], ctx)) || (await evaluate(args[1], ctx));
    case "not":
      return !(await evaluate(args[0], ctx));

    // Math
    case "+":
      return (await evaluate(args[0], ctx)) + (await evaluate(args[1], ctx));
    case "-":
      return (await evaluate(args[0], ctx)) - (await evaluate(args[1], ctx));
    case "*":
      return (await evaluate(args[0], ctx)) * (await evaluate(args[1], ctx));
    case "/":
      return (await evaluate(args[0], ctx)) / (await evaluate(args[1], ctx));

    // Capabilities
    case "prop": {
      const [targetExpr, keyExpr] = args;
      const target = await evaluateTarget(targetExpr, ctx);
      const key = await evaluate(keyExpr, ctx);

      if (!target || typeof key !== "string") return null;

      // Check permission
      if (!checkPermission(ctx.caller, target, "view")) {
        throw new ScriptError(`Permission denied: cannot view ${target.id}`);
      }

      return target.props[key];
    }

    case "set": {
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
    }

    case "tell": {
      const [targetExpr, msgExpr] = args;
      // Special case: 'caller'
      if (targetExpr === "caller") {
        if (ctx.sys?.send) {
          ctx.sys.send({ type: "message", text: await evaluate(msgExpr, ctx) });
        }
        return;
      }
      return null;
    }

    default:
      throw new ScriptError(`Unknown opcode: ${op}`);
  }
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
