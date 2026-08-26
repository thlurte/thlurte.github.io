/**
 * Markdown fence embeds:
 *   ```chart|charts  →  <div class="md-chart" data-chart="...">  (JSON → Recharts)
 *   ```mermaid       →  <div class="md-mermaid" data-mermaid="...">  (→ Mermaid SVG)
 */
import { visit } from 'unist-util-visit';

/**
 * @param {string} raw
 */
function escapeAttr(raw) {
  return encodeURIComponent(raw);
}

/**
 * @returns {import('unified').Plugin<[], import('mdast').Root>}
 */
export function remarkEmbeds() {
  return (tree, file) => {
    visit(tree, 'code', (node, index, parent) => {
      if (parent == null || index == null) return;
      const lang = String(node.lang || '').toLowerCase();
      const raw = String(node.value || '').trim();
      if (!raw) return;

      if (lang === 'chart' || lang === 'charts') {
        try {
          JSON.parse(raw);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          file.message(`Invalid JSON in \`\`\`${lang} block: ${msg}`, node);
          return;
        }
        parent.children[index] = {
          type: 'html',
          value: `<div class="md-chart not-prose" data-chart="${escapeAttr(raw)}"></div>`,
        };
        return;
      }

      if (lang === 'mermaid') {
        parent.children[index] = {
          type: 'html',
          value: `<div class="md-mermaid not-prose" data-mermaid="${escapeAttr(raw)}"></div>`,
        };
      }
    });
  };
}

/** @deprecated use remarkEmbeds */
export const remarkChart = remarkEmbeds;
