import * as StdLib from "./lib/std";
import { describe, expect, test } from "bun:test";
import { transpile } from "./transpiler";

describe("transpile top-level function", () => {
  test("unwraps top-level function arguments", () => {
    const code = `
      export function test(a, b) {
        log(a, b);
      }
    `;
    const expected = StdLib.seq(StdLib.let("a", StdLib.arg(0)), StdLib.let("b", StdLib.arg(1)), [
      "log",
      StdLib.var("a"),
      StdLib.var("b"),
    ]);

    // The plan says: "Update transpile function to detect if the source code consists of a single FunctionDeclaration... If true, extract parameters..."

    // For now, let's just see what happens.
    expect(transpile(code)).toEqual(expected);
  });
});
