import {
  SysMint,
  SysCreate,
  SysSudo,
  EntityControl,
  hydrateCapability,
} from "../packages/core/src/runtime/capabilities";
import { FsRead, FsWrite } from "../plugins/fs/src/lib";
import { NetHttp } from "../plugins/net/src/lib";
import { strict as assert } from "assert";

console.log("Checking capability classes...");

// 1. SysMint
try {
  const mintCap = hydrateCapability({
    id: "mint-cap",
    ownerId: 0,
    type: "sys.mint",
    params: { namespace: "test" },
  }) as unknown as SysMint;

  if (mintCap instanceof SysMint) {
    console.log("SysMint hydrated correctly");
  } else {
    console.error("SysMint hydration failed", mintCap);
  }

  if (typeof mintCap.mint === "function") {
    console.log("SysMint.mint is a function");
  } else {
    console.error("SysMint.mint is missing");
  }
} catch (e) {
  console.error("SysMint test failed", e);
}

console.log("Finished checks.");
