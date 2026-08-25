#!/usr/bin/env node
/**
 * Generate unique p5.brush paintings:
 *  - post covers → public/paintings/{slug}.jpg + frontmatter
 *  - home tech drawings → public/paintings/home/{slug}.jpg + src/data/homeDrawings.ts
 *
 * Usage: npm run paintings
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'paintings');
const HOME_OUT = path.join(OUT, 'home');
const PORT = 4177;
const W = 1400;
const H = 1050;

const HOME_JOBS = [
  { slug: 'neural-net', label: 'Neural net' },
  { slug: 'transformer', label: 'Transformer' },
  { slug: 'circuit', label: 'Circuit' },
  { slug: 'chip', label: 'Chip' },
  { slug: 'rag-pipeline', label: 'RAG pipeline' },
  { slug: 'gpu-grid', label: 'GPU grid' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/octet-stream',
};

async function collectPostJobs() {
  const jobs = [];
  for (const collection of ['blog', 'research']) {
    const dir = path.join(ROOT, 'src', 'content', collection);
    if (!existsSync(dir)) continue;
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.md')) continue;
      const slug = file.replace(/\.md$/, '');
      jobs.push({
        kind: 'post',
        collection,
        slug,
        theme: 'post',
        file: path.join(dir, file),
        outDir: OUT,
      });
    }
  }
  return jobs;
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(ROOT, url === '/' ? 'scripts/paintings/studio.html' : url.replace(/^\//, ''));
      if (url.startsWith('/scripts/paintings/studio')) {
        filePath = path.join(ROOT, 'scripts/paintings/studio.html');
      }
      if (!existsSync(filePath) || !filePath.startsWith(ROOT)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function ensureImageFrontmatter(mdPath, imagePath) {
  let text = await readFile(mdPath, 'utf8');
  if (!text.startsWith('---')) return;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return;
  let fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);
  if (/^image:/m.test(fm)) {
    fm = fm.replace(/^image:.*$/m, `image: ${imagePath}`);
  } else {
    fm = fm.replace(/\n---\s*$/, `\nimage: ${imagePath}\n---`);
  }
  await writeFile(mdPath, fm + body, 'utf8');
}

async function renderJob(page, job) {
  const url = `http://127.0.0.1:${PORT}/scripts/paintings/studio.html?slug=${encodeURIComponent(job.slug)}&theme=${job.theme}&w=${W}&h=${H}`;
  console.log(`→ ${job.kind}/${job.slug} (${job.theme})`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(
    () => window.__PAINT_READY__ === true || window.__PAINT_ERROR__,
    null,
    { timeout: 180000 },
  );
  const err = await page.evaluate(() => window.__PAINT_ERROR__);
  if (err) throw new Error(`Paint failed for ${job.slug}: ${err}`);

  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  await mkdir(job.outDir, { recursive: true });
  await page.waitForTimeout(500);
  const pngPath = path.join(job.outDir, `${job.slug}.png`);
  const jpgPath = path.join(job.outDir, `${job.slug}.jpg`);
  await canvas.screenshot({ path: pngPath, type: 'png' });

  try {
    execFileSync('magick', [pngPath, '-strip', '-quality', '85', '-resize', '1600x', jpgPath], {
      stdio: 'inherit',
    });
  } catch {
    await writeFile(jpgPath, await readFile(pngPath));
  }

  try {
    await import('node:fs/promises').then((fs) => fs.unlink(pngPath));
  } catch {
    /* ignore */
  }

  return jpgPath;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(HOME_OUT, { recursive: true });

  const postJobs = await collectPostJobs();
  const homeJobs = HOME_JOBS.map((j) => ({
    kind: 'home',
    slug: j.slug,
    label: j.label,
    theme: 'tech',
    outDir: HOME_OUT,
  }));

  const jobs = [...postJobs, ...homeJobs];
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  console.log(`Generating ${jobs.length} p5.brush painting(s)…`);

  const homeManifest = [];

  for (const job of jobs) {
    await renderJob(page, job);
    if (job.kind === 'post' && job.file) {
      const publicPath = `/paintings/${job.slug}.jpg`;
      await ensureImageFrontmatter(job.file, publicPath);
      console.log(`  wrote ${publicPath}`);
    } else {
      const publicPath = `/paintings/home/${job.slug}.jpg`;
      homeManifest.push({ src: publicPath, label: job.label, slug: job.slug });
      console.log(`  wrote ${publicPath}`);
    }
  }

  const manifestTs = `/** Auto-generated by \`npm run paintings\` — do not edit by hand. */
export const homeDrawings = ${JSON.stringify(homeManifest, null, 2)} as const;
`;
  await writeFile(path.join(ROOT, 'src', 'data', 'homeDrawings.ts'), manifestTs, 'utf8');

  await browser.close();
  server.close();
  console.log('Done. Post covers + home tech drawings are hardcoded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
