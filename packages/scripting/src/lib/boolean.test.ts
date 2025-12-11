import * as BooleanOps from "../lib/boolean";
import {
  type ScriptContext,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "../interpreter";
import { beforeEach, expect } from "bun:test";
import { createLibraryTester } from "./test-utils";

createLibraryTester(BooleanOps, "Boolean Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(BooleanOps);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      args: [],
      caller: { id: 1 } as any,
      ops: TEST_OPS,
      send: () => {},
      this: { id: 2 } as any,
      warnings: [],
    });
  });

  // Comparison
  test("==", () => {
    expect(evaluate(BooleanOps.eq(1, 1), ctx)).toBe(true);
    expect(evaluate(BooleanOps.eq(1, 2), ctx)).toBe(false);
    expect(evaluate(BooleanOps.eq(1, 1, 1), ctx)).toBe(true);
  });

  test("!=", () => {
    expect(evaluate(BooleanOps.neq(1, 2), ctx)).toBe(true);
    expect(evaluate(BooleanOps.neq(1, 1), ctx)).toBe(false);
  });

  test("<", () => {
    expect(evaluate(BooleanOps.lt(1, 2), ctx)).toBe(true);
    expect(evaluate(BooleanOps.lt(2, 1), ctx)).toBe(false);
    expect(evaluate(BooleanOps.lt(1, 2, 3), ctx)).toBe(true);
  });

  test(">", () => {
    expect(evaluate(BooleanOps.gt(2, 1), ctx)).toBe(true);
    expect(evaluate(BooleanOps.gt(1, 2), ctx)).toBe(false);
  });

  test("<=", () => {
    expect(evaluate(BooleanOps.lte(1, 1), ctx)).toBe(true);
    expect(evaluate(BooleanOps.lte(1, 2), ctx)).toBe(true);
    expect(evaluate(BooleanOps.lte(2, 1), ctx)).toBe(false);
  });

  test(">=", () => {
    expect(evaluate(BooleanOps.gte(1, 1), ctx)).toBe(true);
    expect(evaluate(BooleanOps.gte(2, 1), ctx)).toBe(true);
    expect(evaluate(BooleanOps.gte(1, 2), ctx)).toBe(false);
  });

  // Logic
  test("and", () => {
    expect(evaluate(BooleanOps.and(true, true), ctx)).toBe(true);
    expect(evaluate(BooleanOps.and(true, false), ctx)).toBe(false);
  });

  test("or", () => {
    expect(evaluate(BooleanOps.or(false, true), ctx)).toBe(true);
    expect(evaluate(BooleanOps.or(false, false), ctx)).toBe(false);
  });

  test("not", () => {
    expect(evaluate(BooleanOps.not(true), ctx)).toBe(false);
    expect(evaluate(BooleanOps.not(false), ctx)).toBe(true);
  });

  test("guard", () => {
    // Basic boolean logic
    expect(evaluate(BooleanOps.guard(true, true), ctx)).toBe(true);
    expect(evaluate(BooleanOps.guard(true, false), ctx)).toBe(false);

    // Value preservation / Short-circuiting
    expect(evaluate(BooleanOps.guard(1, 2), ctx)).toBe(2);
    expect(evaluate(BooleanOps.guard(0, 2), ctx)).toBe(0);
    expect(evaluate(BooleanOps.guard(false, 2), ctx)).toBe(false);
    expect(evaluate(BooleanOps.guard(0, "anything"), ctx)).toBe(0);
  });

  test("nullish", () => {
    expect(evaluate(BooleanOps.nullish(null, 1), ctx)).toBe(1);
    expect(evaluate(BooleanOps.nullish(undefined, 1), ctx)).toBe(1);
    expect(evaluate(BooleanOps.nullish(0, 1), ctx)).toBe(0);
    expect(evaluate(BooleanOps.nullish(false, 1), ctx)).toBe(false);
    expect(evaluate(BooleanOps.nullish(null, undefined, 2), ctx)).toBe(2);
    expect(evaluate(BooleanOps.nullish(null, null), ctx)).toBe(null);
  });
});
