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
    gas: 10_000_000, // High gas limit for benchmarks
    ops: opcodes,
    this: { id: 1 },
  });
}

// Benchmark runner
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
  console.log(`  Average: ${avgTime.toFixed(4)}ms per iteration`);
  console.log(`  Ops/sec: ${(1000 / avgTime).toFixed(0)}`);
  console.log();
}

console.log("Break/Continue Signal Performance Benchmarks");
console.log("=".repeat(60));
console.log();

// Benchmarks
benchmark("simple loop with break (10 iterations, break at 5)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 10],
      [
        "std.seq",
        ["std.set", "count", ["+", ["std.var", "count"], 1]],
        ["std.if", ["==", ["std.var", "count"], 5], ["std.break"]],
      ],
    ],
    ["std.var", "count"],
  ];
  evaluate(script, createContext());
});

benchmark("simple loop with break (100 iterations, break at 50)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 100],
      [
        "std.seq",
        ["std.set", "count", ["+", ["std.var", "count"], 1]],
        ["std.if", ["==", ["std.var", "count"], 50], ["std.break"]],
      ],
    ],
    ["std.var", "count"],
  ];
  evaluate(script, createContext());
});

benchmark("nested loops with break in inner loop", () => {
  const script = [
    "std.seq",
    ["std.let", "outer", 0],
    ["std.let", "total", 0],
    [
      "std.while",
      ["<", ["std.var", "outer"], 10],
      [
        "std.seq",
        ["std.set", "outer", ["+", ["std.var", "outer"], 1]],
        ["std.let", "inner", 0],
        [
          "std.while",
          ["<", ["std.var", "inner"], 10],
          [
            "std.seq",
            ["std.set", "inner", ["+", ["std.var", "inner"], 1]],
            ["std.set", "total", ["+", ["std.var", "total"], 1]],
            ["std.if", ["==", ["std.var", "inner"], 5], ["std.break"]],
          ],
        ],
      ],
    ],
    ["std.var", "total"],
  ];
  evaluate(script, createContext());
});

benchmark("while loop with continue (skip even, 100 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "idx", 0],
    ["std.let", "sum", 0],
    [
      "std.while",
      ["<", ["std.var", "idx"], 100],
      [
        "std.seq",
        ["std.set", "idx", ["+", ["std.var", "idx"], 1]],
        ["std.if", ["==", ["%", ["std.var", "idx"], 2], 0], ["std.continue"]],
        ["std.set", "sum", ["+", ["std.var", "sum"], ["std.var", "idx"]]],
      ],
    ],
    ["std.var", "sum"],
  ];
  evaluate(script, createContext());
});

benchmark("many continues (1000 iterations, continue 90%)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    ["std.let", "processed", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 1000],
      [
        "std.seq",
        ["std.set", "count", ["+", ["std.var", "count"], 1]],
        ["std.if", ["<", ["%", ["std.var", "count"], 10], 9], ["std.continue"]],
        ["std.set", "processed", ["+", ["std.var", "processed"], 1]],
      ],
    ],
    ["std.var", "processed"],
  ];
  evaluate(script, createContext());
});

console.log("BASELINE TESTS (for comparison)");
console.log("=".repeat(60));
console.log();

benchmark("baseline: simple loop without break/continue (100 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "count", 0],
    [
      "std.while",
      ["<", ["std.var", "count"], 100],
      ["std.set", "count", ["+", ["std.var", "count"], 1]],
    ],
    ["std.var", "count"],
  ];
  evaluate(script, createContext());
});

console.log("INTERPRETATION:");
console.log("=".repeat(60));
console.log("Compare the break/continue tests against the baseline.");
console.log("The overhead of throwing and catching signals can be estimated");
console.log("by comparing equivalent loops with and without break/continue.");
console.log();
