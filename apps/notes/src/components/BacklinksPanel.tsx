import { For, Show } from "solid-js";
import { notesStore } from "../store/notes";

export function BacklinksPanel() {
  const { state, getNote } = notesStore;

  function handleBacklinkClick(noteId: string) {
    getNote(noteId);
  }

  function getContextSnippet(context: string, maxLength = 100): string {
    if (context.length <= maxLength) {
      return context;
    }
    return context.slice(0, maxLength) + "...";
  }

  return (
    <div class="notes__backlinks">
      <h3 class="backlinks-panel__title">Backlinks</h3>

      <Show
        when={state.currentNote}
        fallback={<p class="backlinks-panel__empty">Select a note to see backlinks</p>}
      >
        <Show
          when={state.backlinks.length > 0}
          fallback={<p class="backlinks-panel__empty">No notes link to this note</p>}
        >
          <ul class="backlinks-panel__list">
            <For each={state.backlinks}>
              {(backlink) => (
                <li
                  class="backlinks-panel__item"
                  onClick={() => handleBacklinkClick(backlink.id)}
                >
                  <div class="backlinks-panel__item-title">{backlink.title}</div>
                  <div class="backlinks-panel__item-context">
                    {getContextSnippet(backlink.context)}
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
