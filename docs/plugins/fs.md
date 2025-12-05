# File System Plugin

The `@viwo/plugin-fs` package provides file system capabilities to ViwoScript.

## Capabilities

### `fs.read`

Allows reading files within a specific directory.

**Parameters:**

- `path`: The directory path that can be read.

### `fs.write`

Allows writing files within a specific directory.

**Parameters:**

- `path`: The directory path that can be written to.

## Opcodes

### `fs.read(cap, path)`

Reads the content of a file as a string.

- `cap`: A capability of type `fs.read`.
- `path`: The path to the file.

### `fs.write(cap, path, content)`

Writes content to a file.

- `cap`: A capability of type `fs.write`.
- `path`: The path to the file.
- `content`: The string content to write.

### `fs.list(cap, path)`

Lists the contents of a directory.

- `cap`: A capability of type `fs.read`.
- `path`: The path to the directory.
