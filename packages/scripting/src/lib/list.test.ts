import { expect, beforeEach } from "bun:test";
import {
  evaluate,
  ScriptContext,
  registerLibrary,
  createScriptContext,
} from "../interpreter";
import * as Core from "./std";
import * as List from "./list";
import * as MathLib from "./math";
import * as BooleanLib from "./boolean";
import { createLibraryTester } from "./test-utils";

createLibraryTester(List, "List Library", (test) => {
  registerLibrary(Core);
  registerLibrary(List);
  registerLibrary(MathLib);
  registerLibrary(BooleanLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      this: { id: 2 } as any,
    });
  });

  test("list.new", () => {
    expect(evaluate(List["list.new"](1, 2, 3), ctx)).toEqual([1, 2, 3]);
  });

  test("list.len", () => {
    expect(evaluate(List["list.len"](List["list.new"](1, 2, 3)), ctx)).toBe(3);
    expect(evaluate(List["list.len"](List["list.new"]()), ctx)).toBe(0);
  });

  test("list.empty", () => {
    expect(evaluate(List["list.empty"](List["list.new"]()), ctx)).toBe(true);
    expect(evaluate(List["list.empty"](List["list.new"](1)), ctx)).toBe(false);
  });

  test("list.get", () => {
    expect(evaluate(List["list.get"](List["list.new"](10, 20), 1), ctx)).toBe(
      20,
    );
    expect(evaluate(List["list.get"](List["list.new"](10, 20), 5), ctx)).toBe(
      undefined,
    );
  });

  test("list.set", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](1, 2, 3)), localCtx);
    evaluate(List["list.set"](Core["var"]("l"), 1, 99), localCtx);
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([1, 99, 3]);
  });

  test("list.push", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](1, 2)), localCtx);

    expect(evaluate(List["list.push"](Core["var"]("l"), 3), localCtx)).toBe(3); // Returns new length
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([1, 2, 3]);
  });

  test("list.pop", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](1, 2, 3)), localCtx);

    expect(evaluate(List["list.pop"](Core["var"]("l")), localCtx)).toBe(3); // Returns popped value
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([1, 2]);
  });

  test("list.unshift", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](2, 3)), localCtx);

    expect(evaluate(List["list.unshift"](Core["var"]("l"), 1), localCtx)).toBe(
      3,
    );
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([1, 2, 3]);
  });

  test("list.shift", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](1, 2, 3)), localCtx);

    expect(evaluate(List["list.shift"](Core["var"]("l")), localCtx)).toBe(1);
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([2, 3]);
  });

  test("list.slice", () => {
    const list = [1, 2, 3, 4, 5];
    // list.slice returns a new list
    expect(
      evaluate(List["list.slice"](List["list.new"](...list), 1, 3), ctx),
    ).toEqual([2, 3]);
  });

  test("list.splice", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](1, 2, 3, 4)), localCtx);

    // Remove 2 elements starting at index 1, insert 99
    const removed = evaluate(
      List["list.splice"](Core["var"]("l"), 1, 2, 99),
      localCtx,
    );
    expect(removed).toEqual([2, 3]);
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([1, 99, 4]);
  });

  test("list.concat", () => {
    expect(
      evaluate(
        List["list.concat"](List["list.new"](1), List["list.new"](2)),
        ctx,
      ),
    ).toEqual([1, 2]);
  });

  test("list.includes", () => {
    expect(
      evaluate(List["list.includes"](List["list.new"](1, 2), 2), ctx),
    ).toBe(true);
    expect(
      evaluate(List["list.includes"](List["list.new"](1, 2), 3), ctx),
    ).toBe(false);
  });

  test("list.reverse", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"](1, 2, 3)), localCtx);
    evaluate(List["list.reverse"](Core["var"]("l")), localCtx);
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual([3, 2, 1]);
  });

  test("list.sort", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(Core["let"]("l", List["list.new"]("b", "a", "c")), localCtx);
    evaluate(List["list.sort"](Core["var"]("l")), localCtx);
    expect(evaluate(Core["var"]("l"), localCtx)).toEqual(["a", "b", "c"]);
  });

  test("list.find", () => {
    const gt1 = Core["lambda"](["x"], BooleanLib[">"](Core["var"]("x"), 1));
    expect(
      evaluate(List["list.find"](List["list.new"](1, 2, 3), gt1), ctx),
    ).toBe(2);
  });

  // HOF tests
  test("list.map", () => {
    const inc = Core["lambda"](["x"], MathLib["+"](Core["var"]("x"), 1));
    expect(
      evaluate(List["list.map"](List["list.new"](1, 2, 3), inc), ctx),
    ).toEqual([2, 3, 4]);
  });

  test("list.filter", () => {
    // (lambda (x) (> x 1))
    const gt1 = Core["lambda"](["x"], BooleanLib[">"](Core["var"]("x"), 1));
    expect(
      evaluate(List["list.filter"](List["list.new"](1, 2, 3), gt1), ctx),
    ).toEqual([2, 3]);
  });

  test("list.reduce", () => {
    // (lambda (acc x) (+ acc x))
    const sum = Core["lambda"](
      ["acc", "x"],
      MathLib["+"](Core["var"]("acc"), Core["var"]("x")),
    );
    expect(
      evaluate(List["list.reduce"](List["list.new"](1, 2, 3), sum, 0), ctx),
    ).toBe(6);
  });

  test("list.flatMap", () => {
    // (lambda (x) (list x (+ x 1)))
    const dup = Core["lambda"](
      ["x"],
      List["list.new"](Core["var"]("x"), MathLib["+"](Core["var"]("x"), 1)),
    );
    expect(
      evaluate(List["list.flatMap"](List["list.new"](1, 3), dup), ctx),
    ).toEqual([1, 2, 3, 4]);
  });
});
