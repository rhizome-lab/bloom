# TODOs and Feature Requests

## Refactoring

- [ ] **Core/Scripting**: Move `getAvailableVerbs` from `packages/core/src/index.ts` to scripting.
- [ ] **Core/Repo**: When implementing `move` in scripting, ensure it disallows a box to be put inside itself (recursive check). (Ref: `packages/core/src/repo.test.ts`)

## Features

- [ ] **AI Plugin**: Switch `handleGen` to use `generateObject` for structured output. (Ref: `plugins/ai/src/index.ts`)
- [ ] **AI Plugin**: Use JSON Schema to specify the shape of generated objects. (Ref: `plugins/ai/src/index.ts`)
- [ ] **AI Plugin**: Remove unsafe type assertions. (Ref: `plugins/ai/src/index.ts`)

## Documentation

- [ ] **Socket**: Verify and implement proper login logic in `apps/discord-bot/src/socket.ts`.

## Longer Term Features

- [ ] Use `apps/web/src/utils/type_generator.ts` to generate types for a Monaco editor (+ LSP) for the script editor.
- [ ] AI support for the Monaco editor using the above types, using live feedback from LSP. This should use the AI plugin.
- [ ] Actually call `scheduler.process` in `packages/core/src/scheduler.ts`.
- [ ] Better script errors (stack traces, line numbers (optional), diagnostic showing the code that errored, etc.)
- [ ] Document web frontend more comprehensively (layout, builder mode, etc)
- [ ] Flesh out all frontends
  - [ ] TUI (should have the same layout as web frontend)
  - [ ] Discord bot
- [ ] Script editor support for TUI
- [ ] Capability based security
  - [ ] Does this/should this replace the current permissions system?
- [ ] System integration as (optional) libraries
  - [ ] IO, FS, network etc. (these MUST use capability based security)
- [ ] Consider splitting math and boolean operations out from `packages/core/src/scripting/lib/core.ts` (and extract tests as appropriate)
- [ ] Compiler from ViwoScript to TypeScript - typechecking should be removed from the runtime for performance reasons. It may be desired to typecheck at the boundary (the very outermost call) for type safety. We should also consider typechecking for areas where TypeScript reports type errors.
- [ ] Add generics to type annotations for ViwoScript.
- [ ] Extract ViwoScript to a separate package.
