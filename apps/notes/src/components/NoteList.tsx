import { For, Show, createMemo } from "solid-js";
import type { Note } from "../store/notes";
import { notesStore } from "../store/notes";

export function NoteList() {
  const { state, getNote, searchNotes, clearSearch, createNote } = notesStore;

  const displayedNotes = createMemo(() => {
    if (state.searchQuery && state.searchResults.length > 0) {
      return state.searchResults;
    }
    return state.notes;
  });

  const sortedNotes = createMemo(() => {
    return [...displayedNotes()].sort((a, b) => b.modified - a.modified);
  });

  function handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    searchNotes(input.value);
  }

  function handleNoteClick(note: Note) {
    getNote(note.id);
    clearSearch();
  }

  async function handleNewNote() {
    const title = prompt("Note title:");
    if (title) {
      await createNote(title);
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  return (
    <div class="notes__sidebar">
      <div class="notes__sidebar-header">
        <input
          type="text"
          class="notes__search"
          placeholder="Search notes..."
          value={state.searchQuery}
          onInput={handleSearch}
        />
        <button class="notes__new-btn" onClick={handleNewNote}>
          + New
        </button>
      </div>

      <Show when={state.loading}>
        <div class="notes__loading">Loading...</div>
      </Show>

      <ul class="note-list">
        <For each={sortedNotes()}>
          {(note) => (
            <li
              class={`note-list__item ${state.currentNote?.id === note.id ? "note-list__item--active" : ""}`}
              onClick={() => handleNoteClick(note)}
            >
              <div class="note-list__title">{note.title}</div>
              <div class="note-list__meta">
                {formatDate(note.modified)}
                <Show when={note.tags.length > 0}>
                  <span class="note-list__tags">
                    <For each={note.tags.slice(0, 3)}>
                      {(tag) => <span class="note-list__tag">#{tag}</span>}
                    </For>
                  </span>
                </Show>
              </div>
            </li>
          )}
        </For>
      </ul>

      <Show when={sortedNotes().length === 0 && !state.loading}>
        <div class="notes__empty">
          <Show when={state.searchQuery} fallback="No notes yet. Create one!">
            No notes match "{state.searchQuery}"
          </Show>
        </div>
      </Show>
    </div>
  );
}
