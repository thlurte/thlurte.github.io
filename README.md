# thlurte

Minimal research personal site built with Astro + Tailwind CSS.

## Develop

```bash
npm install
npm run dev
```

## Content

- Blog posts: `src/content/blog/*.md`
- Research notes: `src/content/research/*.md`
- Site identity: `src/data/site.ts`

## Paintings (p5.brush → hardcoded covers)

Covers and home drawings are **generated once with p5.brush**, then saved as JPEGs. The site loads them statically (no runtime brush).

```bash
npm run paintings
```

That regenerates:

- Post/research covers → `public/paintings/{slug}.jpg` + frontmatter `image:`
- Home tech drawings (neural net, transformer, circuit, chip, RAG, GPU) → `public/paintings/home/*.jpg` + `src/data/homeDrawings.ts`

Edit motifs in `scripts/paintings/painter.mjs`, then re-run.
## Build

```bash
npm run build
npm run preview
```
