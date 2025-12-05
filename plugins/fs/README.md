# @viwo/plugin-fs

File System plugin for Viwo. Provides capabilities to read and write files within allowed directories.

## Installation

```bash
bun add @viwo/plugin-fs
```

## Usage

Register the plugin in your server:

```typescript
import { FsPlugin } from "@viwo/plugin-fs";

await pluginManager.loadPlugin(new FsPlugin());
```

## Capabilities

- `fs.read`: Read access to a directory.
- `fs.write`: Write access to a directory.

## Opcodes

- `fs.read(cap, path)`: Read file content.
- `fs.write(cap, path, content)`: Write file content.
- `fs.list(cap, path)`: List directory contents.
