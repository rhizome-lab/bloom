# Web Editor

The Web Editor package (`@bloom/web-editor`) provides React/SolidJS components for editing BloomScript code. It wraps the Monaco Editor and provides custom language support.

## Components

### `ScriptEditor`

The main component for editing scripts. It handles:

- Syntax highlighting for BloomScript.
- Autocompletion.
- Error reporting.

### `MonacoEditor`

A lower-level wrapper around the Monaco Editor instance.

## Usage

```tsx
import { ScriptEditor } from "@bloom/web-editor";

function MyEditor() {
  return (
    <ScriptEditor
      value="if (true) { print('Hello'); }"
      onChange={(newValue) => console.log(newValue)}
    />
  );
}
```
