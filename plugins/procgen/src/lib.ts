import { Xoroshiro128Plus } from "./xoroshiro";
import { createNoise2D } from "simplex-noise";
import { defineFullOpcode } from "@viwo/scripting";

// Default seed
let prng = new Xoroshiro128Plus(12_345);
let noise2D = createNoise2D(() => prng.float());

/**
 * Seeds the procedural generation system.
 * This affects both `procgen.noise` and `procgen.random`.
 */
export const seed = defineFullOpcode<[seed: number], void>("procgen.seed", {
  handler: ([seedVal], _ctx) => {
    prng = new Xoroshiro128Plus(seedVal);
    // Re-create noise generator to use the new PRNG state effectively
    // initialized from the start of the sequence
    noise2D = createNoise2D(() => prng.float());
  },
  metadata: {
    category: "procgen",
    description: "Seeds the procedural generation system.",
    label: "Seed ProcGen",
    parameters: [{ description: "The seed value.", name: "seed", type: "number" }],
    returnType: "void",
    slots: [{ name: "Seed", type: "number" }],
  },
});

/**
 * Generates 2D Simplex noise.
 * Returns a value between -1 and 1.
 */
export const noise = defineFullOpcode<[xCoord: number, yCoord: number], number>("procgen.noise", {
  handler: ([cx, cy], _ctx) => noise2D(cx, cy),
  metadata: {
    category: "procgen",
    description: "Generates 2D Simplex noise.",
    label: "Noise 2D",
    parameters: [
      { description: "The X coordinate.", name: "x", type: "number" },
      { description: "The Y coordinate.", name: "y", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "X", type: "block" },
      { name: "Y", type: "block" },
    ],
  },
});

/**
 * Generates a seeded random number.
 * - `random()`: Float 0..1
 * - `random(max)`: 0..max
 * - `random(min, max)`: min..max
 */
export const random = defineFullOpcode<[min?: number, max?: number], number>("procgen.random", {
  handler: (args, _ctx) => {
    if (args.length === 0) {
      return prng.float();
    }

    let min = 0;
    let max = 1;

    if (args.length === 1) {
      max = args[0] as number;
    } else {
      [min, max] = args as [number, number];
    }

    return prng.range(min, max);
  },
  metadata: {
    category: "procgen",
    description: "Generates a seeded random number.",
    label: "Seeded Random",
    parameters: [
      { description: "Min value (inclusive).", name: "min", optional: true, type: "number" },
      { description: "Max value (inclusive).", name: "max", optional: true, type: "number" },
    ],
    returnType: "number",
    slots: [
      { default: 0, name: "Min", type: "number" },
      { default: 1, name: "Max", type: "number" },
    ],
  },
});

/**
 * Generates a seeded random integer between min and max (inclusive).
 * Equivalent to the deprecated random.between().
 */
export const between = defineFullOpcode<[min: number, max: number], number>("procgen.between", {
  handler: ([min, max], _ctx) => {
    if (min > max) {
      throw new Error("procgen.between: min must be less than or equal to max");
    }
    return Math.floor(prng.range(min, max + 1));
  },
  metadata: {
    category: "procgen",
    description: "Generates a seeded random integer between min and max (inclusive).",
    label: "Seeded Integer",
    parameters: [
      { description: "Minimum value (inclusive).", name: "min", type: "number" },
      { description: "Maximum value (inclusive).", name: "max", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "Min", type: "number" },
      { name: "Max", type: "number" },
    ],
  },
});

/**
 * Returns a random item from a list using the seeded PRNG.
 * Equivalent to the deprecated random.choice().
 */
export const choice = defineFullOpcode<[list: unknown[]], unknown>("procgen.choice", {
  handler: ([list], _ctx) => {
    if (!Array.isArray(list)) {
      throw new TypeError("procgen.choice: argument must be a list");
    }
    if (list.length === 0) {
      return null;
    }
    const idx = Math.floor(prng.float() * list.length);
    return list[idx];
  },
  metadata: {
    category: "procgen",
    description: "Returns a random item from a list using the seeded PRNG.",
    label: "Seeded Choice",
    parameters: [{ description: "The list to pick from.", name: "list", type: "any[]" }],
    returnType: "any",
    slots: [{ name: "List", type: "block" }],
  },
});
