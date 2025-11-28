import { evaluate, ScriptError, ScriptLibraryDefinition } from "../interpreter";
import { config } from "../config";

export const StringLibrary: ScriptLibraryDefinition = {
  "string.length": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("string.length requires 1 argument");
      }
    }
    const [strExpr] = args;
    const str = await evaluate(strExpr, ctx);
    if (typeof str !== "string") return 0;
    return str.length;
  },
  "string.concat": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("string.concat requires 2 arguments");
      }
    }
    const [str1Expr, str2Expr] = args;
    const str1 = await evaluate(str1Expr, ctx);
    const str2 = await evaluate(str2Expr, ctx);
    if (typeof str1 !== "string" || typeof str2 !== "string") return "";
    return str1 + str2;
  },
  "string.split": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("string.split requires 2 arguments");
      }
    }
    const [strExpr, sepExpr] = args;
    const str = await evaluate(strExpr, ctx);
    const sep = await evaluate(sepExpr, ctx);
    if (typeof str !== "string" || typeof sep !== "string") return [];
    return str.split(sep);
  },
  "string.slice": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length < 2 || args.length > 3) {
        throw new ScriptError("string.slice requires 2 or 3 arguments");
      }
    }
    const [strExpr, startExpr, endExpr] = args;
    const str = await evaluate(strExpr, ctx);
    const start = await evaluate(startExpr, ctx);
    const end = endExpr ? await evaluate(endExpr, ctx) : undefined;
    if (typeof str !== "string" || typeof start !== "number") return "";
    return str.slice(start, end);
  },
  "string.to_upper": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("string.to_upper requires 1 argument");
      }
    }
    const [strExpr] = args;
    const str = await evaluate(strExpr, ctx);
    if (typeof str !== "string") return "";
    return str.toUpperCase();
  },
  "string.to_lower": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("string.to_lower requires 1 argument");
      }
    }
    const [strExpr] = args;
    const str = await evaluate(strExpr, ctx);
    if (typeof str !== "string") return "";
    return str.toLowerCase();
  },
  "string.trim": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("string.trim requires 1 argument");
      }
    }
    const [strExpr] = args;
    const str = await evaluate(strExpr, ctx);
    if (typeof str !== "string") return "";
    return str.trim();
  },
  "string.replace": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 3) {
        throw new ScriptError("string.replace requires 3 arguments");
      }
    }
    const [strExpr, searchExpr, replaceExpr] = args;
    const str = await evaluate(strExpr, ctx);
    const search = await evaluate(searchExpr, ctx);
    const replace = await evaluate(replaceExpr, ctx);
    if (
      typeof str !== "string" ||
      typeof search !== "string" ||
      typeof replace !== "string"
    )
      return str;
    return str.replace(search, replace);
  },
  "string.includes": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 2) {
        throw new ScriptError("string.includes requires 2 arguments");
      }
    }
    const [strExpr, searchExpr] = args;
    const str = await evaluate(strExpr, ctx);
    const search = await evaluate(searchExpr, ctx);
    if (typeof str !== "string" || typeof search !== "string") return false;
    return str.includes(search);
  },
};
