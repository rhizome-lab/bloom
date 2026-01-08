# Notes Server Seeds

TypeScript entity definitions for the Notes server.

## Contents

- **src/definitions/**: Entity class definitions (EntityBase, System, Notes)

These definitions are loaded by the Rust notes-server at startup to seed the world.

## Server

The actual server is implemented in Rust at `crates/apps/notes-server/`.
