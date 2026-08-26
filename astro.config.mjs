// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import tailwindcss from '@tailwindcss/vite';
import { remarkEmbeds } from './src/plugins/remark-embeds.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://thlurte.github.io',
  integrations: [react()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkEmbeds],
      rehypePlugins: [rehypeRaw, rehypeKatex],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
