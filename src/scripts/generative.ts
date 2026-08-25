import type p5 from 'p5';
import * as brush from 'p5.brush';

/** Deterministic string → 32-bit seed */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fast tips only — charcoal/marker/spray are too heavy for list/home UX */
const FAST_TIPS = ['HB', '2B', 'pen', '2H'] as const;

function pickBrush(seed: number): string {
  const available = brush.box().filter((n) => (FAST_TIPS as readonly string[]).includes(n));
  const list = available.length ? available : [...FAST_TIPS];
  return list[seed % list.length];
}

function scaleFor(w: number, h: number) {
  // Keep tips readable without exploding particle count
  return Math.max(0.7, Math.min(2.2, Math.min(w, h) / 280));
}

/**
 * Bind p5.brush to an instance — must run once inside the sketch fn,
 * BEFORE setup/draw (library requirement).
 */
export function bindBrush(s: p5) {
  brush.instance(s);
}

/**
 * Ink illustration via p5.brush. Canvas must already be WEBGL.
 */
export function drawGenerative(
  s: p5,
  seed: number,
  w: number,
  h: number,
  _animated = false,
  paper = true,
) {
  // Re-bind in case multiple sketches share the module
  brush.instance(s);
  brush.load();
  s.randomSeed(seed);
  s.noiseSeed(seed);
  s.angleMode(s.DEGREES);

  if (paper) {
    s.background(252, 250, 245);
  } else {
    s.clear();
  }

  brush.scaleBrushes(scaleFor(w, h));

  const tip = pickBrush(seed);
  const ink = seed % 3 === 0 ? '#0076df' : seed % 3 === 1 ? '#1c1c1c' : '#2a241c';
  const accent = '#0076df';
  const family = seed % 6;
  const sc = Math.min(w, h) * 0.4;

  if (family === 0) drawMug(tip, ink, accent, sc);
  else if (family === 1) drawLeaf(tip, ink, accent, sc);
  else if (family === 2) drawBird(tip, ink, accent, sc);
  else if (family === 3) drawBook(tip, ink, accent, sc);
  else if (family === 4) drawFace(tip, ink, accent, sc);
  else drawLandscape(tip, ink, accent, sc);
}

function setTip(name: string, color: string, weight = 1) {
  brush.set(name, color, weight);
}

/** Prefer short line segments over dense splines (much faster). */
function poly(points: [number, number][]) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    brush.line(x1, y1, x2, y2);
  }
}

function drawMug(tip: string, ink: string, accent: string, sc: number) {
  setTip(tip, ink, 1);
  poly([
    [-sc * 0.4, -sc * 0.25],
    [-sc * 0.45, sc * 0.15],
    [-sc * 0.3, sc * 0.5],
    [sc * 0.3, sc * 0.5],
    [sc * 0.45, sc * 0.15],
    [sc * 0.4, -sc * 0.25],
  ]);
  brush.circle(0, -sc * 0.25, sc * 0.4, true);
  poly([
    [sc * 0.4, -sc * 0.1],
    [sc * 0.68, 0],
    [sc * 0.7, sc * 0.22],
    [sc * 0.42, sc * 0.24],
  ]);
  setTip(tip, accent, 0.8);
  brush.line(-sc * 0.15, -sc * 0.4, -sc * 0.1, -sc * 0.75);
  brush.line(0, -sc * 0.42, 0.02 * sc, -sc * 0.8);
  brush.line(sc * 0.15, -sc * 0.4, sc * 0.1, -sc * 0.75);
}

function drawLeaf(tip: string, ink: string, accent: string, sc: number) {
  setTip(tip, ink, 1);
  poly([
    [0, sc * 0.6],
    [-sc * 0.48, sc * 0.1],
    [-sc * 0.28, -sc * 0.4],
    [0, -sc * 0.65],
    [sc * 0.28, -sc * 0.4],
    [sc * 0.48, sc * 0.1],
    [0, sc * 0.6],
  ]);
  brush.line(0, sc * 0.55, 0, -sc * 0.58);
  for (let i = 0; i < 4; i++) {
    const y = sc * 0.35 - i * sc * 0.2;
    const spread = sc * (0.28 - i * 0.04);
    brush.line(0, y, -spread, y - sc * 0.06);
    brush.line(0, y, spread, y - sc * 0.06);
  }
  setTip(tip, accent, 0.85);
  brush.line(0, sc * 0.6, 0, sc * 0.85);
}

function drawBird(tip: string, ink: string, accent: string, sc: number) {
  setTip(tip, ink, 1);
  brush.circle(-sc * 0.05, sc * 0.08, sc * 0.36, true);
  brush.circle(sc * 0.32, -sc * 0.16, sc * 0.18, true);
  setTip(tip, accent, 0.9);
  brush.line(sc * 0.48, -sc * 0.16, sc * 0.72, -sc * 0.1);
  brush.line(sc * 0.48, -sc * 0.08, sc * 0.72, -sc * 0.1);
  setTip(tip, ink, 0.95);
  brush.circle(sc * 0.36, -sc * 0.2, sc * 0.03, false);
  poly([
    [-sc * 0.05, 0],
    [-sc * 0.15, -sc * 0.15],
    [sc * 0.1, 0],
    [sc * 0.16, sc * 0.12],
  ]);
  brush.line(-sc * 0.35, sc * 0.05, -sc * 0.65, -sc * 0.1);
  brush.line(-sc * 0.35, sc * 0.12, -sc * 0.62, sc * 0.2);
  brush.line(-sc * 0.05, sc * 0.3, -sc * 0.08, sc * 0.5);
  brush.line(sc * 0.08, sc * 0.28, sc * 0.1, sc * 0.5);
}

function drawBook(tip: string, ink: string, accent: string, sc: number) {
  setTip(tip, ink, 1);
  poly([
    [0, -sc * 0.4],
    [-sc * 0.65, -sc * 0.34],
    [-sc * 0.68, sc * 0.4],
    [0, sc * 0.46],
  ]);
  poly([
    [0, -sc * 0.4],
    [sc * 0.65, -sc * 0.34],
    [sc * 0.68, sc * 0.4],
    [0, sc * 0.46],
  ]);
  brush.line(0, -sc * 0.4, 0, sc * 0.46);
  setTip(tip, ink, 0.7);
  for (let i = 0; i < 4; i++) {
    const y = -sc * 0.15 + i * sc * 0.12;
    brush.line(-sc * 0.5, y, -sc * 0.1, y);
    brush.line(sc * 0.1, y, sc * 0.5, y);
  }
  setTip(tip, accent, 0.85);
  brush.line(sc * 0.2, -sc * 0.38, sc * 0.24, -sc * 0.68);
  brush.line(sc * 0.24, -sc * 0.68, sc * 0.36, -sc * 0.55);
}

function drawFace(tip: string, ink: string, accent: string, sc: number) {
  setTip(tip, ink, 1.05);
  brush.circle(0, 0, sc * 0.52, true);
  brush.line(-sc * 0.3, -sc * 0.25, -sc * 0.4, -sc * 0.62);
  brush.line(-sc * 0.4, -sc * 0.62, -sc * 0.08, -sc * 0.35);
  brush.line(sc * 0.3, -sc * 0.25, sc * 0.4, -sc * 0.62);
  brush.line(sc * 0.4, -sc * 0.62, sc * 0.08, -sc * 0.35);
  setTip(tip, accent, 0.95);
  brush.circle(-sc * 0.16, -sc * 0.02, sc * 0.08, true);
  brush.circle(sc * 0.16, -sc * 0.02, sc * 0.08, true);
  setTip(tip, ink, 0.85);
  brush.line(-sc * 0.16, -sc * 0.05, -sc * 0.16, sc * 0.03);
  brush.line(sc * 0.16, -sc * 0.05, sc * 0.16, sc * 0.03);
  brush.line(0, sc * 0.1, -sc * 0.06, sc * 0.18);
  brush.line(0, sc * 0.1, sc * 0.06, sc * 0.18);
  brush.line(-sc * 0.12, sc * 0.14, -sc * 0.55, sc * 0.05);
  brush.line(sc * 0.12, sc * 0.14, sc * 0.55, sc * 0.05);
}

function drawLandscape(tip: string, ink: string, accent: string, sc: number) {
  setTip(tip, ink, 0.85);
  poly([
    [-sc, sc * 0.1],
    [-sc * 0.4, -sc * 0.15],
    [0, 0],
    [sc * 0.35, -sc * 0.25],
    [sc, sc * 0.08],
  ]);
  setTip(tip, ink, 1.05);
  poly([
    [-sc, sc * 0.4],
    [-sc * 0.3, 0],
    [sc * 0.1, sc * 0.28],
    [sc * 0.45, 0],
    [sc, sc * 0.35],
  ]);
  brush.line(-sc, sc * 0.52, sc, sc * 0.52);
  setTip(tip, accent, 0.95);
  brush.circle(sc * 0.3, -sc * 0.48, sc * 0.14, true);
  setTip(tip, ink, 0.9);
  for (const tx of [-sc * 0.45, 0, sc * 0.2]) {
    brush.line(tx, sc * 0.45, tx, sc * 0.22);
    brush.line(tx, sc * 0.22, tx - sc * 0.07, sc * 0.34);
    brush.line(tx, sc * 0.22, tx + sc * 0.07, sc * 0.34);
  }
}
