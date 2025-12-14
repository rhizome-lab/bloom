# Break/Continue Performance Investigation Summary

## What We Did

We investigated the performance of the exception-based `BreakSignal` and `ContinueSignal` implementation in the ViwoScript interpreter to determine if the TODO item suggesting a refactor to return values was warranted.

## Key Discoveries

### 1. Exception Overhead is Real But Not the Main Problem
- **Break**: ~167μs overhead for a single break in a 100-iteration loop
- **Continue**: ~16μs overhead per continue signal
- This is measurable, but...

### 2. The Interpreter is 500-4000x Slower Than Compiled Code
- Baseline loop: **547x slower**
- Loop with break: **1024x slower**
- Loop with continue: **4270x slower**
- The compiled version runs in ~0.3μs vs interpreter's ~145-928μs

### 3. The Compiler Uses Native Break/Continue
- Zero exception overhead
- Compiles to JavaScript's native `break` and `continue` statements
- See `packages/scripting/src/compiler.ts` lines 283-287

## The Math

For a 100-iteration loop with 50 continues:

| Implementation | Time | Speedup |
|----------------|------|---------|
| **Current Interpreter** | 928μs | 1x (baseline) |
| Hypothetical return-value interpreter | ~245μs | ~3.8x |
| **Compiled Code** | 0.22μs | **4220x** |

Even if we optimized break/continue to use return values:
- We'd still be **1100x slower** than compiled code
- We'd only save ~73% in continue-heavy code
- The interpreter would still be the bottleneck

## Recommendation

**DO NOT refactor break/continue to return values**

**Instead:**
1. **For performance-critical code**: Use the compiler (1000-4000x speedup)
2. **For development/debugging**: The interpreter is fine (better error messages)
3. **If optimizing the interpreter**: Profile first, then address the real bottlenecks (scope management, opcode lookup, etc.)

## Files Created

1. `benchmarks/break_continue.bench.ts` - Initial benchmarks
2. `benchmarks/break_continue_revised.bench.ts` - More accurate isolated measurements
3. `benchmarks/compiler_vs_interpreter.bench.ts` - Compiler comparison
4. `benchmarks/break_continue_analysis.md` - Full analysis and recommendations

## TODO.md Updated

The TODO item has been updated with LOW PRIORITY status and a note to use the compiler for performance-critical code.
