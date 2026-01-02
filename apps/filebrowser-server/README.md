# File Browser Server

A sandboxed file browser server using capability-gated filesystem access.

## Running

```bash
bun dev:filebrowser-server  # runs on port 8080
```

## Architecture

The server uses the Viwo entity system with filesystem capabilities. On startup, it seeds:

1. **FileBrowserBase** - Base prototype with path resolution and core verbs
2. **FileBrowserUser** - User prototype with bookmarks and tags
3. **Browser** - User instance with `fs.read` and `fs.write` capabilities

Files are accessed through the `fs.read` and `fs.write` capabilities, which sandbox access to a configurable root directory.

## Data Model

```typescript
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mtime?: string;
}

interface FileBrowserUserProps {
  cwd: string;                    // Current working directory
  fs_root: string;                // Sandbox root (can't escape this)
  bookmarks: Record<string, string>;
  file_metadata: Record<string, { tags?: string[]; annotations?: string[] }>;
}
```

## Verbs

| Verb | Args | Returns |
|------|------|---------|
| `look` | - | `{ type: "directory_listing", path, entries: FileEntry[] }` |
| `go` | `path` | `{ type: "directory_listing", path, entries: FileEntry[] }` |
| `back` | - | Same as `go("..")` |
| `where` | - | `{ type: "where", path: string }` |
| `open` | `name` | `FileContent` or `DirectoryListing` |
| `write` | `name`, `content` | `{ type: "write_success", path }` |
| `create_dir` | `name` | `{ type: "dir_created", path }` |
| `create_file` | `name` | `{ type: "file_created", path }` |
| `remove` | `name` | `{ type: "removed", path }` |
| `bookmark` | `name`, `path?` | `{ type: "bookmark_created", name, path }` |
| `bookmarks_list` | - | `{ type: "bookmarks", bookmarks: Record<string, string> }` |
| `jump` | `name` | `{ type: "directory_listing", ... }` |
| `tag` | `path`, `tag` | `{ type: "tag_added", path, tag }` |
| `untag` | `path`, `tag` | `{ type: "tag_removed", path, tag }` |
| `tags` | `path?` | `{ type: "tags", path, tags: string[] }` |
| `annotate` | `path`, `note` | `{ type: "annotation_added", path, note }` |

## Sandbox Security

- All paths are resolved relative to `cwd` and clamped to `fs_root`
- The `resolve_path` verb prevents directory traversal attacks
- Capabilities (`fs.read`, `fs.write`) are granted per-user

## Tests

```bash
bun test apps/filebrowser-server/src/seed.test.ts
```

22 tests covering navigation, file operations, bookmarks, and tags.
