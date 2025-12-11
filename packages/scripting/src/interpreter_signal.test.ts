import * as StdLib from "./lib/std";
import { ReturnSignal, createOpcodeRegistry, createScriptContext, evaluate } from "./interpreter";
import { describe, expect, it } from "bun:test";

const ops = createOpcodeRegistry(StdLib);

describe("Interpreter Signal Propagation", () => {
  it("should catch return signal by default", async () => {
    const code = StdLib.return("value");
    const ctx = createScriptContext({ caller: { id: 1 }, ops, this: { id: 1 } });
    const result = await evaluate<string>(code, ctx);
    expect(result).toBe("value");
  });

  it("should propagate return signal when catchReturn is false", async () => {
    const code = StdLib.return("value");
    const ctx = createScriptContext({ caller: { id: 1 }, ops, this: { id: 1 } });
    try {
      await evaluate(code, ctx, { catchReturn: false });
      expect().fail("Should have thrown ReturnSignal");
    } catch (error: any) {
      expect(error).toBeInstanceOf(ReturnSignal);
      expect(error.value).toBe("value");
    }
  });

  it("should propagate return signal from if block", async () => {
    const code = StdLib.if(true, StdLib.return("value"));
    const ctx = createScriptContext({ caller: { id: 1 }, ops, this: { id: 1 } });
    // std.if calls evaluate(block, { catchReturn: false }) internally (if updated)
    // std.if ITSELF is called via evaluate(if, ..., true) (default)
    // So std.if should catch the propagated signal and return it?
    // Wait. std.if implementation CATCHES and RETHROWS.
    // So executeLoop (outer) sees ReturnSignal.
    // If we call evaluate(if) with default (catchReturn: true).
    // It should RETURN the value.
    const result = await evaluate(code, ctx);
    expect(result).toBe("value");
  });
});
