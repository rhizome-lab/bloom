import * as boolean from "../src/lib/boolean";
import * as math from "../src/lib/math";
import * as std from "../src/lib/std";
import { createOpcodeRegistry, createScriptContext, evaluate } from "../src/interpreter";

// Create opcode registry
const opcodes = createOpcodeRegistry(std, boolean, math);

// Helper to create context
function createContext() {
  return createScriptContext({
    caller: { id: 1 },
    gas: 10_000_000,
    ops: opcodes,
    this: { id: 1 },
  });
}

// More accurate benchmark runner
function benchmark(name: string, fn: () => void, iterations = 1000) {
  // Warmup
  for (let idx = 0; idx < 10; idx += 1) {
    fn();
  }

  // Actual benchmark
  const start = performance.now();
  for (let idx = 0; idx < iterations; idx += 1) {
    fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`${name}:`);
  console.log(`  Total: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average: ${avgTime.toFixed(4)}ms (${(avgTime * 1000).toFixed(2)}μs)`);
  console.log();

  return avgTime;
}

console.log("REVISED: Isolating Break/Continue Overhead");
console.log("=".repeat(70));
console.log();

console.log("TEST 1: Identical loops - one with break, one that just completes");
console.log("-".repeat(70));

const baseline1 = benchmark("Baseline: Loop 10 iterations, stop naturally at 10", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 10],
      ["std.set", "count", ["+", ["std.var", "count"], 1]],
    ],
    ["std.var", "count"],
  ];
  evaluate(script, createContext());
});

const withBreak1 = benchmark("With break: Loop with break at iteration 10", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      true,
      [
        "std.seq",
        ["std.set", "count", ["+", ["std.var", "count"], 1]],
        ["std.if", ["==", ["std.var", "count"], 10], ["std.break"]],
      ],
    ],
    ["std.var", "count"],
  ];
  evaluate(script, createContext());
});

console.log(
  `Overhead: ${((withBreak1 - baseline1) * 1000).toFixed(2)}μs (${(
    (withBreak1 / baseline1 - 1) *
    100
  ).toFixed(1)}%)`,
);
console.log();

console.log("TEST 2: Measuring continue overhead");
console.log("-".repeat(70));

const baseline2 = benchmark("Baseline: Loop 100 times with conditional check", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    ["std.let", "sum", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 100],
      [
        "std.seq",
        ["std.set", "count", ["+", ["std.var", "count"], 1]],
        // Check if even, but don't continue - just do nothing in the then branch
        [
          "std.if",
          ["==", ["%", ["std.var", "count"], 2], 0],
          null, // Do nothing for even numbers
          ["std.set", "sum", ["+", ["std.var", "sum"], ["std.var", "count"]]],
        ],
      ],
    ],
    ["std.var", "sum"],
  ];
  evaluate(script, createContext());
});

const withContinue = benchmark(
  "With continue: Same loop but using continue for even numbers",
  () => {
    const script = [
      "std.seq",
      ["std.let", "count", 0],
      ["std.let", "sum", 0],
      [
        "std.while",
        ["<", ["std.var", "count"], 100],
        [
          "std.seq",
          ["std.set", "count", ["+", ["std.var", "count"], 1]],
          ["std.if", ["==", ["%", ["std.var", "count"], 2], 0], ["std.continue"]],
          ["std.set", "sum", ["+", ["std.var", "sum"], ["std.var", "count"]]],
        ],
      ],
      ["std.var", "sum"],
    ];
    evaluate(script, createContext());
  },
);

console.log(`Overhead per continue: ${(((withContinue - baseline2) / 50) * 1000).toFixed(2)}μs`);
console.log(`(50 continues out of 100 iterations)`);
console.log();

console.log("TEST 3: Interpreter baseline - how fast is the interpreter itself?");
console.log("-".repeat(70));

benchmark("Empty loop (1 iteration)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    ["std.while", ["<", ["std.var", "count"], 1], ["std.set", "count", 1]],
  ];
  evaluate(script, createContext());
});

benchmark("Empty loop (10 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 10],
      ["std.set", "count", ["+", ["std.var", "count"], 1]],
    ],
  ];
  evaluate(script, createContext());
});

benchmark("Empty loop (100 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 100],
      ["std.set", "count", ["+", ["std.var", "count"], 1]],
    ],
  ];
  evaluate(script, createContext());
});

console.log();
console.log("TEST 4: Just evaluating the script (no loop)");
console.log("-".repeat(70));

benchmark("Single variable assignment", () => {
  evaluate(["std.let", "x", 42], createContext());
});

benchmark("Single addition", () => {
  evaluate(["+", 1, 2], createContext());
});

benchmark("Sequence of 3 operations", () => {
  evaluate(
    ["std.seq", ["std.let", "x", 1], ["std.set", "x", 2], ["std.var", "x"]],
    createContext(),
  );
});
