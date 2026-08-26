import { createRoot, type Root } from 'react-dom/client';
import { useEffect } from 'react';
import MdChart, { type ChartSpec } from './MdChart';

const chartRoots = new WeakMap<Element, Root>();

function mountCharts() {
  document.querySelectorAll<HTMLElement>('.md-chart[data-chart]').forEach((el) => {
    if (el.dataset.chartMounted === '1') return;
    const encoded = el.getAttribute('data-chart');
    if (!encoded) return;

    let spec: ChartSpec;
    try {
      spec = JSON.parse(decodeURIComponent(encoded)) as ChartSpec;
    } catch (err) {
      el.textContent = `Invalid chart JSON: ${err instanceof Error ? err.message : String(err)}`;
      el.dataset.chartMounted = '1';
      return;
    }

    if (!Array.isArray(spec.data)) {
      el.textContent = 'Chart JSON must include a data array.';
      el.dataset.chartMounted = '1';
      return;
    }

    const root = createRoot(el);
    chartRoots.set(el, root);
    root.render(<MdChart spec={spec} />);
    el.dataset.chartMounted = '1';
  });
}

async function mountMermaid() {
  const nodes = [
    ...document.querySelectorAll<HTMLElement>('.md-mermaid[data-mermaid]'),
  ].filter((el) => el.dataset.mermaidMounted !== '1');
  if (nodes.length === 0) return;

  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });

  for (const el of nodes) {
    const encoded = el.getAttribute('data-mermaid');
    if (!encoded) continue;
    const src = decodeURIComponent(encoded);
    const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const { svg } = await mermaid.render(id, src);
      el.innerHTML = svg;
      el.dataset.mermaidMounted = '1';
    } catch (err) {
      el.textContent = `Mermaid error: ${err instanceof Error ? err.message : String(err)}`;
      el.dataset.mermaidMounted = '1';
    }
  }
}

/** Hydrates ```chart and ```mermaid fences left by remark-embeds. */
export default function MarkdownEmbeds() {
  useEffect(() => {
    mountCharts();
    void mountMermaid();
  }, []);

  return null;
}
