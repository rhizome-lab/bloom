import { defineFullOpcode } from "../types";
import { evaluate } from "../interpreter";

// Comparison
/** Checks if all arguments are equal. */
export const eq = defineFullOpcode<[first: unknown, second: unknown, ...rest: unknown[]], boolean>(
  "==",
  {
    handler: ([first, ...rest], _ctx) => {
      let prev = first;
      for (const next of rest) {
        if (prev !== next) {
          return false;
        }
        prev = next;
      }
      return true;
    },
    metadata: {
      category: "logic",
      description: "Checks if all arguments are equal.",
      label: "Equals",
      layout: "infix",
      parameters: [
        { description: "The first value to compare.", name: "left", type: "unknown" },
        { description: "The second value to compare.", name: "right", type: "unknown" },
        {
          description: "Additional values to compare.",
          name: "...args",
          optional: false,
          type: "unknown[]",
        },
      ],
      returnType: "boolean",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
    },
  },
);

/** Checks if adjacent arguments are different. */
export const neq = defineFullOpcode<[first: unknown, second: unknown, ...rest: unknown[]], boolean>(
  "!=",
  {
    handler: ([first, ...rest], _ctx) => {
      let prev = first;
      for (const next of rest) {
        if (prev === next) {
          return false;
        }
        prev = next;
      }
      return true;
    },
    metadata: {
      category: "logic",
      description: "Checks if adjacent arguments are different.",
      label: "!=",
      layout: "infix",
      parameters: [
        { description: "The first value to compare.", name: "left", type: "unknown" },
        { description: "The second value to compare.", name: "right", type: "unknown" },
        {
          description: "Additional values to compare.",
          name: "...args",
          optional: false,
          type: "unknown[]",
        },
      ],
      returnType: "boolean",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
    },
  },
);

/** Checks if arguments are strictly increasing. */
export const lt = defineFullOpcode<[first: number, second: number, ...rest: number[]], boolean>(
  "<",
  {
    handler: ([first, ...rest], _ctx) => {
      let prev = first;
      for (const next of rest) {
        if (prev >= next) {
          return false;
        }
        prev = next;
      }
      return true;
    },
    metadata: {
      category: "logic",
      description: "Checks if arguments are strictly increasing.",
      label: "<",
      layout: "infix",
      parameters: [
        { description: "The first number.", name: "left", type: "number" },
        { description: "The second number.", name: "right", type: "number" },
        { description: "Additional numbers.", name: "...args", type: "number[]" },
      ],
      returnType: "boolean",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
    },
  },
);

/** Checks if arguments are strictly decreasing. */
export const gt = defineFullOpcode<[first: number, second: number, ...rest: number[]], boolean>(
  ">",
  {
    handler: ([first, ...rest], _ctx) => {
      let prev = first;
      for (const next of rest) {
        if (prev <= next) {
          return false;
        }
        prev = next;
      }
      return true;
    },
    metadata: {
      category: "logic",
      description: "Checks if arguments are strictly decreasing.",
      label: ">",
      layout: "infix",
      parameters: [
        { description: "The first number.", name: "left", type: "number" },
        { description: "The second number.", name: "right", type: "number" },
        { description: "Additional numbers.", name: "...args", type: "number[]" },
      ],
      returnType: "boolean",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
    },
  },
);

/** Checks if arguments are non-decreasing. */
export const lte = defineFullOpcode<[first: number, second: number, ...rest: number[]], boolean>(
  "<=",
  {
    handler: ([first, ...rest], _ctx) => {
      let prev = first;
      for (const next of rest) {
        if (prev > next) {
          return false;
        }
        prev = next;
      }
      return true;
    },
    metadata: {
      category: "logic",
      description: "Checks if arguments are non-decreasing.",
      label: "<=",
      layout: "infix",
      parameters: [
        { description: "The first number.", name: "left", type: "number" },
        { description: "The second number.", name: "right", type: "number" },
        { description: "Additional numbers.", name: "...args", type: "number[]" },
      ],
      returnType: "boolean",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
    },
  },
);

/** Checks if arguments are non-increasing. */
export const gte = defineFullOpcode<[first: number, second: number, ...rest: number[]], boolean>(
  ">=",
  {
    handler: ([first, ...rest], _ctx) => {
      let prev = first;
      for (const next of rest) {
        if (prev < next) {
          return false;
        }
        prev = next;
      }
      return true;
    },
    metadata: {
      category: "logic",
      description: "Checks if arguments are non-increasing.",
      label: ">=",
      layout: "infix",
      parameters: [
        { description: "The first number.", name: "left", type: "number" },
        { description: "The second number.", name: "right", type: "number" },
        { description: "Additional numbers.", name: "...args", type: "number[]" },
      ],
      returnType: "boolean",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
    },
  },
);

// Logic
/** Logical AND. */
export const and = defineFullOpcode<
  [first: boolean, second: boolean, ...rest: boolean[]],
  boolean,
  true
>("and", {
  handler: (args, ctx) => {
    let idx = 0;
    const next = (): any => {
      if (idx >= args.length) {
        return true;
      }
      const arg = args[idx]!;
      idx += 1;
      const result = evaluate(arg, ctx);

      if (result instanceof Promise) {
        return result.then((res) => {
          if (!res) {
            return false;
          }
          return next();
        });
      }
      if (!result) {
        return false;
      }
      return next();
    };
    return next();
  },
  metadata: {
    category: "logic",
    description: "Logical AND. Returns true if all arguments are true.",
    label: "And",
    layout: "infix",
    lazy: true,
    parameters: [
      { description: "The first value.", name: "left", type: "boolean" },
      { description: "The second value.", name: "right", type: "boolean" },
      { description: "Additional values.", name: "...args", type: "boolean[]" },
    ],
    returnType: "boolean",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Logical OR. */
export const or = defineFullOpcode<
  [first: boolean, second: boolean, ...rest: boolean[]],
  boolean,
  true
>("or", {
  handler: (args, ctx) => {
    let idx = 0;
    const next = (): any => {
      if (idx >= args.length) {
        return false;
      }
      const arg = args[idx]!;
      idx += 1;
      const result = evaluate(arg, ctx);
      if (result instanceof Promise) {
        return result.then((res) => {
          if (res) {
            return true;
          }
          return next();
        });
      }
      if (result) {
        return true;
      }
      return next();
    };
    return next();
  },
  metadata: {
    category: "logic",
    description: "Logical OR. Returns true if at least one argument is true.",
    label: "Or",
    layout: "infix",
    lazy: true,
    parameters: [
      { description: "The first value.", name: "left", type: "boolean" },
      { description: "The second value.", name: "right", type: "boolean" },
      { description: "Additional values.", name: "...args", type: "boolean[]" },
    ],
    returnType: "boolean",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/**
 * Logical AND (Short-circuiting).
 * Often used as a Guard: `guard(cond, value)` returns `value` if `cond` is truthy, else `cond`.
 */
export const guard = defineFullOpcode<
  [first: unknown, second: unknown, ...rest: unknown[]],
  unknown,
  true
>("guard", {
  handler: (args, ctx) => {
    let idx = 0;
    const next = (): any => {
      if (idx >= args.length) {
        return true;
      }
      const arg = args[idx]!;
      idx += 1;
      const result = evaluate(arg, ctx);

      const processResult = (res: any) => {
        if (!res) {
          return res;
        }
        if (idx >= args.length) {
          return res;
        }
        return next();
      };

      if (result instanceof Promise) {
        return result.then(processResult);
      }
      return processResult(result);
    };
    return next();
  },
  metadata: {
    category: "logic",
    description: "Short-circuiting AND. Returns the first falsy value or the last value.",
    label: "Guard",
    layout: "infix",
    lazy: true,
    parameters: [
      { description: "The first value.", name: "left", type: "unknown" },
      { description: "The second value.", name: "right", type: "unknown" },
      { description: "Additional values.", name: "...args", type: "unknown[]" },
    ],
    returnType: "unknown",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Nullish Coalescing. */
export const nullish = defineFullOpcode<
  [first: unknown, second: unknown, ...rest: unknown[]],
  unknown,
  true
>("nullish", {
  handler: (args, ctx) => {
    let idx = 0;
    const next = (): any => {
      if (idx >= args.length) {
        return null;
      }
      const arg = args[idx]!;
      idx += 1;
      const result = evaluate(arg, ctx);

      const processResult = (res: any) => {
        if (res !== null && res !== undefined) {
          return res;
        }
        if (idx >= args.length) {
          return res;
        }
        return next();
      };

      if (result instanceof Promise) {
        return result.then(processResult);
      }
      return processResult(result);
    };
    return next();
  },
  metadata: {
    category: "logic",
    description: "Nullish Coalescing. Returns the first non-null/undefined value.",
    label: "Nullish Coalescing",
    layout: "infix",
    lazy: true,
    parameters: [
      { description: "The first value.", name: "left", type: "unknown" },
      { description: "The second value.", name: "right", type: "unknown" },
      { description: "Additional values.", name: "...args", type: "unknown[]" },
    ],
    returnType: "unknown",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Logical NOT. */
export const not = defineFullOpcode<[value: boolean], boolean>("not", {
  handler: ([val], _ctx) => !val,
  metadata: {
    category: "logic",
    description: "Logical NOT. Returns the opposite boolean value.",
    label: "Not",
    parameters: [
      {
        description: "The boolean value to negate.",
        name: "value",
        optional: false,
        type: "unknown",
      },
    ],
    returnType: "boolean",
    slots: [{ name: "Val", type: "block" }],
  },
});
