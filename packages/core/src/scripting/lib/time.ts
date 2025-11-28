import { evaluate, ScriptError, ScriptLibraryDefinition } from "../interpreter";
import { config } from "../config";

export const TimeLibrary: ScriptLibraryDefinition = {
  "time.now": async (args, _ctx) => {
    if (config.validateCommands) {
      if (args.length !== 0) {
        throw new ScriptError("time.now requires 0 arguments");
      }
    }
    return Date.now();
  },
  "time.format": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("time.format requires 1 argument");
      }
    }
    const [timestampExpr] = args;
    const timestamp = await evaluate(timestampExpr, ctx);
    if (typeof timestamp !== "number") return "";
    return new Date(timestamp).toISOString();
  },
  "time.parse": async (args, ctx) => {
    if (config.validateCommands) {
      if (args.length !== 1) {
        throw new ScriptError("time.parse requires 1 argument");
      }
    }
    const [dateStrExpr] = args;
    const dateStr = await evaluate(dateStrExpr, ctx);
    if (typeof dateStr !== "string") return 0;
    return new Date(dateStr).getTime();
  },
};
