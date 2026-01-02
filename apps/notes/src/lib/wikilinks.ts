/**
 * Wikilink utilities using mdast/hast.
 */
import { fromMarkdown } from "mdast-util-from-markdown";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
// @ts-expect-error - no types available
import { syntax } from "micromark-extension-wiki-link";
// @ts-expect-error - no types available
import { fromMarkdown as wikiFromMarkdown } from "mdast-util-wiki-link";

/**
 * Extract wikilinks from markdown content.
 * Returns array of unique link targets.
 */
export function extractWikilinks(content: string): string[] {
  const tree = fromMarkdown(content, {
    extensions: [syntax()],
    mdastExtensions: [wikiFromMarkdown()],
  });

  const links: string[] = [];
  const seen = new Set<string>();

  function visit(node: unknown) {
    if (node && typeof node === "object" && "type" in node) {
      const n = node as { type: string; value?: string; children?: unknown[] };
      if (n.type === "wikiLink" && "value" in n && typeof n.value === "string") {
        const target = n.value;
        const lower = target.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          links.push(target);
        }
      }
      if (n.children && Array.isArray(n.children)) {
        for (const child of n.children) {
          visit(child);
        }
      }
    }
  }

  visit(tree);
  return links;
}

/**
 * Render markdown with wikilinks to HTML.
 * @param resolver - Function to resolve a link target to a note ID (null if missing)
 */
export function renderMarkdown(
  content: string,
  resolver: (target: string) => string | null,
): string {
  const tree = fromMarkdown(content, {
    extensions: [syntax()],
    mdastExtensions: [wikiFromMarkdown()],
  });

  // Convert mdast to hast with custom handler for wikiLinks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hast = toHast(tree, {
    unknownHandler(_state: unknown, node: unknown) {
      const n = node as { type: string; value?: string; data?: { alias?: string } };
      if (n.type !== "wikiLink") return undefined;

      const target = n.value ?? "";
      const display = n.data?.alias ?? target;
      const noteId = resolver(target);

      if (noteId) {
        return {
          type: "element",
          tagName: "a",
          properties: {
            href: "#",
            className: ["wikilink"],
            "data-note-id": noteId,
          },
          children: [{ type: "text", value: display }],
        };
      }

      return {
        type: "element",
        tagName: "span",
        properties: {
          className: ["wikilink", "wikilink--missing"],
        },
        children: [{ type: "text", value: display }],
      };
    },
  } as Parameters<typeof toHast>[1]);

  return toHtml(hast);
}
