/**
 * Complex p5.brush painting — browser module (standalone build).
 * Seeded so each slug gets a unique, dense composition.
 */
export function hashSeed(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {typeof import('p5.brush/standalone')} brush
 * @param {{ seed: number, width: number, height: number, title?: string, theme?: 'post' | 'tech' }} opts
 */
export function paintComplex(brush, opts) {
  const { seed, width: W, height: H, theme = 'post' } = opts;
  const rand = mulberry32(seed);
  const R = (a, b) => a + rand() * (b - a);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.angleMode(brush.DEGREES);

  brush.createCanvas(W, H);
  // Keep tip scale moderate so strokes stay on-canvas and readable
  brush.scaleBrushes(Math.max(1.8, Math.min(W, H) / 320));

  // Standalone/WebGL origin is canvas center — shift so (0,0)..(W,H) fills the frame
  brush.push();
  brush.translate(-W / 2, -H / 2);

  brush.clear('#f4f0e8');

  const ink = '#1a1917';
  const accent = '#0076df';
  const soft = '#6e685c';

  // Full-frame underpainting — guaranteed coverage (not sparse corners)
  brush.noStroke();
  brush.fill(accent, 10);
  brush.fillBleed(0.15);
  brush.fillTexture(0.35, 0.5);
  brush.rect(W * 0.05, H * 0.05, W * 0.9, H * 0.9, false);

  brush.fill(soft, 8);
  brush.polygon([
    [0, H * 0.2],
    [W * 0.4, 0],
    [W, H * 0.35],
    [W * 0.7, H],
    [0, H],
  ]);

  // Dense hatch band across the middle
  brush.noFill();
  brush.hatch(8, 35, { rand: 0.35, continuous: true, gradient: 0.25 });
  brush.set('HB', soft, 0.9);
  brush.rect(W * 0.08, H * 0.15, W * 0.84, H * 0.7, true);
  brush.noHatch();

  // Flow field covering the whole page
  try {
    brush.field(pick(['curved', 'seabed', 'waves', 'zigzag']));
  } catch {
    brush.field('curved');
  }

  const tips = ['HB', '2B', 'pen', 'charcoal', 'marker', 'rotring', 'cpencil'];
  for (let i = 0; i < 48; i++) {
    const tip = pick(tips);
    const col = i % 4 === 0 ? accent : i % 3 === 0 ? soft : ink;
    brush.set(tip, col, R(0.7, 1.4));
    brush.stroke(col);
    // Even grid of seeds so coverage is uniform
    const gx = ((i % 8) + 0.5) / 8;
    const gy = (Math.floor(i / 8) + 0.5) / 6;
    brush.flowLine(W * gx + R(-20, 20), H * gy + R(-20, 20), R(W * 0.18, W * 0.42), R(0, 360));
  }
  brush.noField();

  // Subject motif (full-bleed)
  if (theme === 'tech') {
    const techMotifs = [motifNeuralNet, motifTransformer, motifCircuit, motifChip, motifRag, motifGpu];
    techMotifs[seed % techMotifs.length](brush, W, H, ink, accent, soft, rand, R, pick);
  } else {
    const family = seed % 5;
    if (family === 0) motifScopes(brush, W, H, ink, accent, rand, R, pick);
    else if (family === 1) motifLattice(brush, W, H, ink, accent, soft, rand, R, pick);
    else if (family === 2) motifCollision(brush, W, H, ink, accent, soft, rand, R, pick);
    else if (family === 3) motifArcs(brush, W, H, ink, accent, rand, R, pick);
    else motifScript(brush, W, H, ink, accent, soft, rand, R, pick);
  }

  // Border frame so edges aren't empty when cropped
  brush.set('HB', ink, 1.1);
  brush.stroke(ink);
  brush.rect(24, 24, W - 48, H - 48, true);

  // Accent cross-beams for contrast on cream paper
  brush.set('marker', accent, 1.05);
  brush.stroke(accent);
  for (let i = 0; i < 8; i++) {
    brush.line(R(40, W - 40), R(40, H - 40), R(40, W - 40), R(40, H - 40));
  }

  brush.pop();
  brush.render();
}

function motifScopes(brush, W, H, ink, accent, rand, R, pick) {
  // Nested lifetime boxes (RAII vibe)
  brush.set('HB', ink, 1.1);
  brush.stroke(ink);
  for (let i = 0; i < 7; i++) {
    const m = 40 + i * 28 + R(-8, 8);
    brush.rect(m, m * 0.8, W - m * 2, H - m * 1.6, true);
  }
  brush.set('pen', accent, 1);
  brush.stroke(accent);
  for (let i = 0; i < 12; i++) {
    const x = R(W * 0.2, W * 0.8);
    brush.line(x, R(H * 0.2, H * 0.4), x, R(H * 0.55, H * 0.8));
  }
}

function motifLattice(brush, W, H, ink, accent, soft, rand, R, pick) {
  brush.set('rotring', ink, 0.85);
  brush.stroke(ink);
  const cols = 14;
  const rows = 10;
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x < cols; x++) {
      const x0 = (x / cols) * W + R(-4, 4);
      const y0 = (y / rows) * H + R(-4, 4);
      const x1 = ((x + 1) / cols) * W + R(-4, 4);
      const y1 = ((y + (rand() > 0.5 ? 1 : 0)) / rows) * H + R(-4, 4);
      brush.line(x0, y0, x1, y1);
    }
  }
  brush.set('marker', accent, 0.7);
  brush.stroke(accent);
  for (let i = 0; i < 9; i++) {
    brush.circle(R(W * 0.15, W * 0.85), R(H * 0.15, H * 0.85), R(20, 70), true);
  }
}

function motifCollision(brush, W, H, ink, accent, soft, rand, R, pick) {
  // Two fields colliding
  brush.set('charcoal', soft, 1.2);
  brush.stroke(soft);
  for (let i = 0; i < 20; i++) {
    brush.flowLine(R(0, W * 0.45), R(0, H), R(80, 200), R(-40, 40));
  }
  brush.set('charcoal', accent, 1.15);
  brush.stroke(accent);
  for (let i = 0; i < 20; i++) {
    brush.flowLine(R(W * 0.55, W), R(0, H), R(80, 200), R(140, 220));
  }
  brush.set('HB', ink, 1.3);
  brush.stroke(ink);
  brush.spline(
    [
      [W * 0.5 + R(-30, 30), 40],
      [W * 0.45 + R(-40, 40), H * 0.35],
      [W * 0.55 + R(-40, 40), H * 0.65],
      [W * 0.5 + R(-30, 30), H - 40],
    ],
    0.5,
  );
}

function motifArcs(brush, W, H, ink, accent, rand, R, pick) {
  const cx = W * 0.5;
  const cy = H * 0.5;
  for (let i = 0; i < 22; i++) {
    const tip = pick(['HB', '2B', 'pen', 'marker']);
    brush.set(tip, i % 4 === 0 ? accent : ink, R(0.7, 1.3));
    brush.stroke(i % 4 === 0 ? accent : ink);
    const r = 40 + i * 14 + R(-6, 6);
    brush.arc(cx + R(-20, 20), cy + R(-20, 20), r, R(0, 360), R(60, 280), true);
  }
}

function motifScript(brush, W, H, ink, accent, soft, rand, R, pick) {
  // Dense handwritten-like strokes
  for (let row = 0; row < 16; row++) {
    const y = 50 + row * ((H - 100) / 16);
    brush.set(pick(['pen', 'HB', '2B']), row % 5 === 0 ? accent : ink, R(0.5, 1.1));
    brush.stroke(row % 5 === 0 ? accent : ink);
    let x = 40;
    while (x < W - 40) {
      const w = R(18, 70);
      brush.spline(
        [
          [x, y + R(-3, 3)],
          [x + w * 0.33, y + R(-10, 10)],
          [x + w * 0.66, y + R(-10, 10)],
          [x + w, y + R(-3, 3)],
        ],
        0.4,
      );
      x += w + R(4, 14);
    }
  }
}

/** --- Tech / electronics / AI architecture motifs --- */

function motifNeuralNet(brush, W, H, ink, accent, soft, rand, R, pick) {
  const layers = [4, 7, 7, 5, 3];
  const xs = layers.map((_, i) => W * (0.12 + (i / (layers.length - 1)) * 0.76));
  const nodes = layers.map((count, li) => {
    const pts = [];
    for (let n = 0; n < count; n++) {
      pts.push({
        x: xs[li],
        y: H * (0.18 + (n / Math.max(1, count - 1)) * 0.64) + R(-6, 6),
      });
    }
    return pts;
  });

  brush.set('pen', soft, 0.7);
  brush.stroke(soft);
  for (let li = 0; li < nodes.length - 1; li++) {
    for (const a of nodes[li]) {
      for (const b of nodes[li + 1]) {
        if (rand() > 0.55) continue;
        brush.line(a.x, a.y, b.x, b.y);
      }
    }
  }

  brush.set('HB', ink, 1.1);
  brush.stroke(ink);
  for (const layer of nodes) {
    for (const p of layer) {
      brush.circle(p.x, p.y, R(10, 18), true);
    }
  }
  brush.set('marker', accent, 0.9);
  brush.stroke(accent);
  for (const p of nodes[nodes.length - 1]) {
    brush.circle(p.x, p.y, 14, false);
  }
}

function motifTransformer(brush, W, H, ink, accent, soft, rand, R, pick) {
  // Stacked attention blocks
  const blocks = 5;
  for (let i = 0; i < blocks; i++) {
    const y = H * (0.12 + i * 0.15);
    const x = W * 0.18;
    const w = W * 0.64;
    const h = H * 0.1;
    brush.set('HB', ink, 1);
    brush.stroke(ink);
    brush.rect(x, y, w, h, true);
    // multi-head stripes
    brush.set('rotring', accent, 0.75);
    brush.stroke(accent);
    const heads = 6;
    for (let hdi = 0; hdi < heads; hdi++) {
      const hx = x + 16 + hdi * ((w - 32) / heads);
      brush.line(hx, y + 8, hx, y + h - 8);
    }
    // residual skip
    brush.set('pen', soft, 0.8);
    brush.stroke(soft);
    brush.spline(
      [
        [x - 20, y + h * 0.5],
        [x - 40, y + h * 0.5 + R(-20, 20)],
        [x - 20, y + h + H * 0.05],
      ],
      0.4,
    );
  }
}

function motifCircuit(brush, W, H, ink, accent, soft, rand, R, pick) {
  brush.set('rotring', ink, 0.95);
  brush.stroke(ink);
  // Manhattan traces
  for (let i = 0; i < 18; i++) {
    let x = R(40, W - 40);
    let y = R(40, H - 40);
    for (let seg = 0; seg < 5; seg++) {
      const nx = rand() > 0.5 ? x + R(-120, 120) : x;
      const ny = rand() > 0.5 ? y : y + R(-100, 100);
      brush.line(x, y, nx, ny);
      x = nx;
      y = ny;
      if (rand() > 0.6) brush.circle(x, y, R(4, 9), false);
    }
  }
  brush.set('marker', accent, 0.85);
  brush.stroke(accent);
  for (let i = 0; i < 8; i++) {
    brush.rect(R(W * 0.1, W * 0.7), R(H * 0.1, H * 0.7), R(40, 90), R(28, 60), true);
  }
}

function motifChip(brush, W, H, ink, accent, soft, rand, R, pick) {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const s = Math.min(W, H) * 0.42;
  brush.set('HB', ink, 1.2);
  brush.stroke(ink);
  brush.rect(cx - s / 2, cy - s / 2, s, s, true);
  // dies
  const grid = 4;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x = cx - s / 2 + 18 + gx * ((s - 36) / grid);
      const y = cy - s / 2 + 18 + gy * ((s - 36) / grid);
      const cell = (s - 36) / grid - 10;
      brush.set(pick(['pen', '2B']), rand() > 0.7 ? accent : ink, 0.85);
      brush.stroke(rand() > 0.7 ? accent : ink);
      brush.rect(x, y, cell, cell, true);
    }
  }
  // pins
  brush.set('rotring', soft, 0.9);
  brush.stroke(soft);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    brush.line(cx - s / 2 + t * s, cy - s / 2, cx - s / 2 + t * s, cy - s / 2 - 28);
    brush.line(cx - s / 2 + t * s, cy + s / 2, cx - s / 2 + t * s, cy + s / 2 + 28);
    brush.line(cx - s / 2, cy - s / 2 + t * s, cx - s / 2 - 28, cy - s / 2 + t * s);
    brush.line(cx + s / 2, cy - s / 2 + t * s, cx + s / 2 + 28, cy - s / 2 + t * s);
  }
}

function motifRag(brush, W, H, ink, accent, soft, rand, R, pick) {
  // Query → retrieve → generate pipeline
  const stages = [
    { labelX: W * 0.12, boxes: 1 },
    { labelX: W * 0.38, boxes: 4 },
    { labelX: W * 0.68, boxes: 1 },
  ];
  const cy = H * 0.5;
  brush.set('HB', ink, 1);
  brush.stroke(ink);
  // query
  brush.rect(W * 0.08, cy - 40, 100, 80, true);
  // corpus stack
  for (let i = 0; i < 5; i++) {
    brush.rect(W * 0.32, cy - 90 + i * 28, 140, 22, true);
  }
  // generator
  brush.rect(W * 0.68, cy - 50, 130, 100, true);

  brush.set('marker', accent, 1);
  brush.stroke(accent);
  brush.line(W * 0.2, cy, W * 0.32, cy);
  brush.line(W * 0.5, cy, W * 0.68, cy);
  // retrieval fan-in
  brush.set('pen', soft, 0.85);
  brush.stroke(soft);
  for (let i = 0; i < 5; i++) {
    brush.line(W * 0.2, cy, W * 0.32, cy - 80 + i * 28 + 11);
  }
}

function motifGpu(brush, W, H, ink, accent, soft, rand, R, pick) {
  // Parallel compute tiles
  const cols = 8;
  const rows = 6;
  const marginX = W * 0.1;
  const marginY = H * 0.14;
  const cw = (W - marginX * 2) / cols;
  const ch = (H - marginY * 2) / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = marginX + x * cw + 4;
      const py = marginY + y * ch + 4;
      brush.set(pick(['HB', 'pen', '2B']), (x + y) % 3 === 0 ? accent : ink, 0.9);
      brush.stroke((x + y) % 3 === 0 ? accent : ink);
      brush.rect(px, py, cw - 10, ch - 10, true);
      if (rand() > 0.55) {
        brush.line(px + 6, py + 6, px + cw - 16, py + ch - 16);
      }
    }
  }
  // bus
  brush.set('charcoal', soft, 1.1);
  brush.stroke(soft);
  brush.line(marginX, H * 0.92, W - marginX, H * 0.92);
  brush.line(W * 0.5, marginY, W * 0.5, H * 0.92);
}
