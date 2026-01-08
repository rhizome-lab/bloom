# File Browser Server Seeds

TypeScript entity definitions for the File Browser server.

## Contents

- **src/definitions/**: Entity class definitions (EntityBase, System, FileBrowser)

These definitions are loaded by the Rust filebrowser-server at startup to seed the world.

## Server

The actual server is implemented in Rust at `crates/apps/filebrowser-server/`.
