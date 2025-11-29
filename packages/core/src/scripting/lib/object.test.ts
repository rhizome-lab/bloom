import { describe, test, expect, beforeEach } from "bun:test";
import {
  evaluate,
  ScriptContext,
  registerLibrary,
  ScriptError,
  createScriptContext,
} from "../interpreter";
import * as Core from "./core";
import * as Object from "./object";
import * as String from "./string"; // Needed for str.concat in flatMap test

describe("Object Library", () => {
  registerLibrary(Core);
  registerLibrary(Object);
  registerLibrary(String);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      this: { id: 2 } as any,
    });
  });

  test("obj.keys", async () => {
    expect(await evaluate(Object["obj.keys"]({ a: 1, b: 2 }), ctx)).toEqual([
      "a",
      "b",
    ]);
    expect(await evaluate(Object["obj.keys"]({}), ctx)).toEqual([]);
  });

  test("obj.values", async () => {
    expect(await evaluate(Object["obj.values"]({ a: 1, b: 2 }), ctx)).toEqual([
      1, 2,
    ]);
  });

  test("obj.entries", async () => {
    expect(await evaluate(Object["obj.entries"]({ a: 1 }), ctx)).toEqual([
      ["a", 1],
    ]);
  });

  test("obj.get", async () => {
    expect(await evaluate(Object["obj.get"]({ a: 1 }, "a"), ctx)).toBe(1);
    expect(
      await evaluate(Object["obj.get"]({ a: 1 }, "b"), ctx).catch((e) => e),
    ).toBeInstanceOf(ScriptError);
  });

  test("obj.set", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core["let"]("o", { a: 1 }), localCtx);
    await evaluate(Object["obj.set"](Core["var"]("o"), "b", 2), localCtx);
    expect(await evaluate(Core["var"]("o"), localCtx)).toEqual({ a: 1, b: 2 });
  });

  test("obj.has", async () => {
    expect(await evaluate(Object["obj.has"]({ a: 1 }, "a"), ctx)).toBe(true);
    expect(await evaluate(Object["obj.has"]({ a: 1 }, "b"), ctx)).toBe(false);
  });

  test("obj.del", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core["let"]("o", { a: 1, b: 2 }), localCtx);
    expect(
      await evaluate(Object["obj.del"](Core["var"]("o"), "a"), localCtx),
    ).toBe(true);
    expect(await evaluate(Core["var"]("o"), localCtx)).toEqual({ b: 2 });
    expect(
      await evaluate(Object["obj.del"](Core["var"]("o"), "c"), localCtx),
    ).toBe(false);
  });

  test("obj.merge", async () => {
    expect(
      await evaluate(Object["obj.merge"]({ a: 1 }, { b: 2, a: 3 }), ctx),
    ).toEqual({ a: 3, b: 2 });
  });

  // HOF tests
  test("obj.map", async () => {
    // (lambda (val key) (+ val 1))
    const inc = Core["lambda"](
      ["val", "key"],
      Core["+"](Core["var"]("val"), 1),
    );
    expect(await evaluate(Object["obj.map"]({ a: 1, b: 2 }, inc), ctx)).toEqual(
      {
        a: 2,
        b: 3,
      },
    );
  });

  test("obj.filter", async () => {
    // (lambda (val key) (> val 1))
    const gt1 = Core["lambda"](
      ["val", "key"],
      Core[">"](Core["var"]("val"), 1),
    );
    expect(
      await evaluate(Object["obj.filter"]({ a: 1, b: 2 }, gt1), ctx),
    ).toEqual({
      b: 2,
    });
  });

  test("obj.reduce", async () => {
    // (lambda (acc val key) (+ acc val))
    const sum = Core["lambda"](
      ["acc", "val", "key"],
      Core["+"](Core["var"]("acc"), Core["var"]("val")),
    );
    expect(
      await evaluate(Object["obj.reduce"]({ a: 1, b: 2 }, sum, 0), ctx),
    ).toBe(3);
  });

  test("obj.flatMap", async () => {
    // (lambda (val key) { [key]: val, [key + "_dup"]: val })
    const expand = Core["lambda"](
      ["val", "key"],
      Core["seq"](
        Core["let"]("o", {}),
        Object["obj.set"](
          Core["var"]("o"),
          Core["var"]("key"),
          Core["var"]("val"),
        ),
        Object["obj.set"](
          Core["var"]("o"),
          String["str.concat"](Core["var"]("key"), "_dup"),
          Core["var"]("val"),
        ),
        Core["var"]("o"),
      ),
    );

    expect(
      await evaluate(Object["obj.flatMap"]({ a: 1 }, expand), ctx),
    ).toEqual({
      a: 1,
      a_dup: 1,
    });
  });
});
