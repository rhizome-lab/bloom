# Notes Server

A wiki-style notes server with wikilinks and backlinks support.

## Running

```bash
bun dev:notes-server  # runs on port 8081
```

## Architecture

The server uses the Viwo entity system to store notes. On startup, it seeds:

1. **NotesBase** - Base prototype with `_generate_note_id` helper
2. **NotesUser** - User prototype with all note verbs
3. **Notebook** - User instance that stores notes

Notes are stored as a `Record<string, Note>` on the user entity's `notes` property.

## Data Model

```typescript
interface Note {
  id: string;           // Unique ID (timestamp_counter)
  title: string;
  content: string;      // Markdown with [[wikilinks]]
  created: number;      // Unix timestamp (ms)
  modified: number;
  tags: string[];
  aliases: string[];    // Alternative titles for linking
  links: string[];      // Outgoing wikilink targets (extracted by client)
}
```

## Verbs

| Verb | Args | Returns |
|------|------|---------|
| `list_notes` | - | `{ type: "notes_list", notes: Note[] }` |
| `create_note` | `title`, `content?`, `links?` | `{ type: "note_created", note: Note }` |
| `get_note` | `noteId` | `{ type: "note_content", note: Note, backlinks: Backlink[] }` |
| `update_note` | `noteId`, `content`, `title?`, `links?` | `{ type: "note_updated", note: Note }` |
| `delete_note` | `noteId` | `{ type: "note_deleted", id: string }` |
| `get_backlinks` | `noteId` | `{ type: "backlinks", noteId: string, backlinks: Backlink[] }` |
| `add_tag` | `noteId`, `tag` | `{ type: "tag_added", noteId, tag }` |
| `remove_tag` | `noteId`, `tag` | `{ type: "tag_removed", noteId, tag }` |
| `add_alias` | `noteId`, `alias` | `{ type: "alias_added", noteId, alias }` |
| `search_notes` | `query` | `{ type: "search_results", query, notes: Note[] }` |
| `find_note_by_title` | `title` | `Note \| null` |

## Backlinks

Backlinks are computed server-side by searching all notes for ones whose `links` array contains the target note's title or aliases. The client is responsible for extracting wikilinks from markdown content and sending them when creating/updating notes.

```typescript
// Client extracts links before saving
const links = extractWikilinks(content);  // ["Other Note", "Another"]
await client.execute("create_note", [title, content, links]);
```

## Tests

```bash
bun test apps/notes-server/src/seed.test.ts
```

19 tests covering CRUD, backlinks, tags, aliases, and search.
