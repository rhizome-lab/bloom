import { Component, For, Show, createMemo } from "solid-js";
import { BLOCK_DEFINITIONS } from "./types";

interface BlockNodeProps {
  node: any;
  path: number[];
  onUpdate: (path: number[], newNode: any) => void;
  onDelete: (path: number[]) => void;
}

export const BlockNode: Component<BlockNodeProps> = (props) => {
  const isArray = createMemo(() => Array.isArray(props.node));

  // Handle null/placeholder
  const isNull = createMemo(() => props.node === null);

  return (
    <Show
      when={!isNull()}
      fallback={
        <div class="block-node block-node--placeholder">Empty Slot</div>
      }
    >
      <Show
        when={isArray()}
        fallback={
          <div class="block-node block-node--literal">
            <input
              class="block-node__input"
              value={props.node}
              onInput={(e) => props.onUpdate(props.path, e.currentTarget.value)}
            />
          </div>
        }
      >
        {(() => {
          const opcode = createMemo(() => props.node[0]);
          const def = createMemo(() =>
            BLOCK_DEFINITIONS.find((d) => d.opcode === opcode()),
          );
          const args = createMemo(() => props.node.slice(1));

          return (
            <Show
              when={def()}
              fallback={
                <div class="block-node block-node--unknown">
                  Unknown: {opcode()}
                </div>
              }
            >
              <div
                class={`block-node block-node--${def()!.type} block-node--${
                  def()!.category
                }`}
              >
                <div class="block-node__header">
                  <span class="block-node__label">{def()!.label}</span>
                  <button
                    class="block-node__delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDelete(props.path);
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div class="block-node__content">
                  <Show when={def()!.opcode === "seq"}>
                    <div class="block-node__sequence">
                      <For each={args()}>
                        {(arg, i) => (
                          <BlockNode
                            node={arg}
                            path={[...props.path, i() + 1]}
                            onUpdate={props.onUpdate}
                            onDelete={props.onDelete}
                          />
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={def()!.opcode !== "seq" && def()!.slots}>
                    <For each={def()!.slots}>
                      {(slot, i) => (
                        <div class="block-node__slot">
                          <span class="block-node__slot-label">
                            {slot.name}:
                          </span>
                          <div class="block-node__slot-content">
                            <Show
                              when={args()[i()] !== undefined}
                              fallback={
                                <div class="block-node__placeholder">
                                  Drop here
                                </div>
                              }
                            >
                              <BlockNode
                                node={args()[i()]}
                                path={[...props.path, i() + 1]}
                                onUpdate={props.onUpdate}
                                onDelete={props.onDelete}
                              />
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>
          );
        })()}
      </Show>
    </Show>
  );
};
