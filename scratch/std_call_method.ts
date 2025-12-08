/** Calls a method on an object, preserving the `this` context. */
export const callMethod = defineFullOpcode<[obj: any, method: string, ...args: any[]], any>(
  "std.call_method",
  {
    handler: ([obj, method, ...args], _ctx) => {
      if (obj === null || obj === undefined) {
        throw new Error(`Cannot call method '${method}' on ${obj}`);
      }
      const func = obj[method];
      if (typeof func !== "function") {
        throw new Error(`Property '${method}' of ${obj} is not a function`);
      }
      return func.apply(obj, args);
    },
    metadata: {
      category: "logic",
      description: "Calls a method on an object, preserving context.",
      label: "Call Method",
      parameters: [
        { description: "The object.", name: "object", type: "any" },
        { description: "The method name.", name: "method", type: "string" },
        { description: "Arguments.", name: "...args", type: "any[]" },
      ],
      returnType: "any",
      slots: [
        { name: "Object", type: "block" },
        { name: "Method", type: "string" },
      ],
    },
  },
);
