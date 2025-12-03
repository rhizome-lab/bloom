import { defineOpcode } from "../def";

// Arithmetic
/**
 * Adds numbers.
 */
const add = defineOpcode<
  [number, number, ...number[]],
  number
>("+", {
  metadata: {
    label: "+",
    category: "math",
    description: "Addition",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    let sum = args[0];
    for (let i = 1; i < args.length; i++) {
      sum += args[i];
    }
    return sum;
  },
});
export { add as "+" };

/**
 * Subtracts numbers.
 */
const sub = defineOpcode<
  [number, number, ...number[]],
  number
>("-", {
  metadata: {
    label: "-",
    category: "math",
    description: "Subtraction",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    let diff = args[0];
    for (let i = 1; i < args.length; i++) {
      diff -= args[i];
    }
    return diff;
  },
});
export { sub as "-" };

/**
 * Multiplies numbers.
 */
const mul = defineOpcode<
  [number, number, ...number[]],
  number
>("*", {
  metadata: {
    label: "*",
    category: "math",
    description: "Multiplication",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    let prod = args[0];
    for (let i = 1; i < args.length; i++) {
      prod *= args[i];
    }
    return prod;
  },
});
export { mul as "*" };

/**
 * Divides numbers.
 */
const div = defineOpcode<
  [number, number, ...number[]],
  number
>("/", {
  metadata: {
    label: "/",
    category: "math",
    description: "Division",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    let quot = args[0];
    for (let i = 1; i < args.length; i++) {
      quot /= args[i];
    }
    return quot;
  },
});
export { div as "/" };

/**
 * Calculates the modulo of two numbers.
 */
const mod = defineOpcode<[number, number], number>(
  "%",
  {
    metadata: {
      label: "%",
      category: "math",
      description: "Modulo",
      layout: "infix",
      slots: [
        { name: "A", type: "block" },
        { name: "B", type: "block" },
      ],
      parameters: [
        { name: "a", type: "number" },
        { name: "b", type: "number" },
      ],
      returnType: "number",
    },
    handler: (args, _ctx) => {
      const aEval = args[0];
      const bEval = args[1];
      return aEval % bEval;
    },
  },
);
export { mod as "%" };

/**
 * Calculates exponentiation (power tower).
 */
const pow = defineOpcode<
  [number, number, ...number[]],
  number
>("^", {
  metadata: {
    label: "^",
    category: "math",
    description: "Exponentiation",
    layout: "infix",
    slots: [
      { name: "Base", type: "block" },
      { name: "Exp", type: "block" },
    ],
    parameters: [
      { name: "base", type: "number" },
      { name: "exp", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    // Power tower
    let pow = args[args.length - 1];
    for (let i = args.length - 2; i >= 0; i--) {
      const next = args[i];
      pow = next ** pow;
    }
    return pow;
  },
});
export { pow as "^" };

/**
 * Generates a random number.
 * - `random()`: Returns a float between 0 (inclusive) and 1 (exclusive).
 * - `random(max)`: Returns a number between 0 (inclusive) and `max` (inclusive). If `max` is an integer, returns an integer.
 * - `random(min, max)`: Returns a number between `min` (inclusive) and `max` (inclusive). If `min` and `max` are integers, returns an integer.
 */
export const random = defineOpcode<
  [number?, number?],
  number
>("random", {
  metadata: {
    label: "Random",
    category: "math",
    description: "Generate random number",
    slots: [
      { name: "Min", type: "number", default: 0 },
      { name: "Max", type: "number", default: 1 },
    ],
    parameters: [
      { name: "min", type: "number", optional: true },
      { name: "max", type: "number", optional: true },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    // random(max), random(min, max) or random() -> 0..1
    if (args.length === 0) return Math.random();
    const min = args.length === 2 ? args[0] : 0;
    const max = args[args.length === 2 ? 1 : 0];
    const shouldFloor = min % 1 === 0 && max % 1 === 0;
    
    // Manual check for min > max because it's a logic error, not type/count error
    if (min > max) {
      // We can keep this or remove it. Let's keep it for now as it's specific logic.
      // But wait, if we remove ScriptError import, we need to import it or use Error.
      // The original code used ScriptError.
      // I removed ScriptError import in this file content.
      // So I should throw Error or re-add ScriptError import.
      throw new Error("random: min must be less than or equal to max");
    }
    const roll = Math.random() * (max - min + 1) + min;
    return shouldFloor ? Math.floor(roll) : roll;
  },
});
