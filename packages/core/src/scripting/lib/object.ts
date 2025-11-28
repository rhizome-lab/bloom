import { config } from "../config";
import {
  evaluate,
  executeLambda,
  ScriptError,
  ScriptLibraryDefinition,
} from "../interpreter";

export const ObjectLibrary: ScriptLibraryDefinition = {
  "object.keys": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("object.keys requires 1 argument");
      }
    }
    const [objExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    if (!obj || typeof obj !== "object") return [];
    return Object.keys(obj);
  },
  "object.values": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("object.values requires 1 argument");
      }
    }
    const [objExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    if (!obj || typeof obj !== "object") return [];
    return Object.values(obj);
  },
  "object.entries": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("object.entries requires 1 argument");
      }
    }
    const [objExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    if (!obj || typeof obj !== "object") return [];
    return Object.entries(obj);
  },
  "object.get": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.get requires 2 arguments");
      }
    }
    const [objExpr, keyExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const key = await evaluate(keyExpr, ctx);
    if (!obj || typeof obj !== "object" || typeof key !== "string") return null;
    return obj[key];
  },
  "object.set": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 3) {
        throw new ScriptError("object.set requires 3 arguments");
      }
    }
    const [objExpr, keyExpr, valExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const key = await evaluate(keyExpr, ctx);
    const val = await evaluate(valExpr, ctx);
    if (!obj || typeof obj !== "object" || typeof key !== "string") return null;
    obj[key] = val;
    return val;
  },
  "object.has": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.has requires 2 arguments");
      }
    }
    const [objExpr, keyExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const key = await evaluate(keyExpr, ctx);
    if (!obj || typeof obj !== "object" || typeof key !== "string")
      return false;
    return key in obj;
  },
  "object.del": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.del requires 2 arguments");
      }
    }
    const [objExpr, keyExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const key = await evaluate(keyExpr, ctx);
    if (!obj || typeof obj !== "object" || typeof key !== "string")
      return false;
    if (key in obj) {
      delete obj[key];
      return true;
    }
    return false;
  },
  "object.merge": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.merge requires 2 arguments");
      }
    }
    const [obj1Expr, obj2Expr] = args;
    const obj1 = await evaluate(obj1Expr, ctx);
    const obj2 = await evaluate(obj2Expr, ctx);
    if (
      !obj1 ||
      typeof obj1 !== "object" ||
      !obj2 ||
      typeof obj2 !== "object"
    ) {
      return {};
    }
    return { ...obj1, ...obj2 };
  },
  "object.map": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.map requires 2 arguments");
      }
    }
    const [objExpr, funcExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const func = await evaluate(funcExpr, ctx);

    if (!obj || typeof obj !== "object" || !func || func.type !== "lambda") {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = await executeLambda(func, [val, key], ctx);
    }
    return result;
  },
  "object.filter": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.filter requires 2 arguments");
      }
    }
    const [objExpr, funcExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const func = await evaluate(funcExpr, ctx);

    if (!obj || typeof obj !== "object" || !func || func.type !== "lambda") {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (await executeLambda(func, [val, key], ctx)) {
        result[key] = val;
      }
    }
    return result;
  },
  "object.reduce": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 3) {
        throw new ScriptError("object.reduce requires 3 arguments");
      }
    }
    const [objExpr, funcExpr, initExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const func = await evaluate(funcExpr, ctx);
    let acc = await evaluate(initExpr, ctx);

    if (!obj || typeof obj !== "object" || !func || func.type !== "lambda") {
      return acc;
    }

    for (const [key, val] of Object.entries(obj)) {
      acc = await executeLambda(func, [acc, val, key], ctx);
    }
    return acc;
  },
  "object.flatMap": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("object.flatMap requires 2 arguments");
      }
    }
    const [objExpr, funcExpr] = args;
    const obj = await evaluate(objExpr, ctx);
    const func = await evaluate(funcExpr, ctx);
    if (!obj || typeof obj !== "object" || !func || func.type !== "lambda") {
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const mapped = await executeLambda(func, [val, key], ctx);
      if (
        typeof mapped === "object" &&
        mapped !== null &&
        !Array.isArray(mapped)
      ) {
        Object.assign(result, mapped);
      }
    }
    return result;
  },
};
