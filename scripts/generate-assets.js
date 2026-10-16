/**
 * Generates every raster asset the app ships with: app icon, adaptive icon,
 * splash art and the favicon. Everything is drawn with plain math and encoded
 * as PNG with Node's zlib, so the project has no image toolchain to install.
 *
 * Run with:  npm run assets     (or: node scripts/generate-assets.js)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets');
const SS = 2; // supersample factor, drawn big then averaged down for clean edges

// ---------------------------------------------------------------- PNG writer

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePNG(canvas) {
  const { width, height, data } = canvas;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ raster

const hex = (value) => {
  const clean = value.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
};

function makeCanvas(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

function blendPixel(canvas, x, y, color, alpha) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (alpha <= 0 || xi < 0 || yi < 0 || xi >= canvas.width || yi >= canvas.height) return;
  const i = (yi * canvas.width + xi) * 4;
  const dstA = canvas.data[i + 3] / 255;
  const outA = alpha + dstA * (1 - alpha);
  if (outA <= 0) return;
  for (let k = 0; k < 3; k += 1) {
    const dst = canvas.data[i + k] / 255;
    const src = color[k] / 255;
    const out = (src * alpha + dst * dstA * (1 - alpha)) / outA;
    canvas.data[i + k] = Math.round(Math.max(0, Math.min(1, out)) * 255);
  }
  canvas.data[i + 3] = Math.round(outA * 255);
}

function ellipse(canvas, cx, cy, rx, ry, color, alpha = 1) {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) blendPixel(canvas, x, y, color, alpha);
    }
  }
}

function polygon(canvas, points, color, alpha = 1) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += 1) {
    const crossings = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      for (let x = Math.floor(crossings[i]); x <= Math.ceil(crossings[i + 1]); x += 1) {
        if (x >= crossings[i] && x <= crossings[i + 1]) blendPixel(canvas, x, y, color, alpha);
      }
    }
  }
}

function roundRect(canvas, x, y, w, h, r, color, alpha = 1) {
  const radius = Math.min(r, w / 2, h / 2);
  for (let yy = Math.floor(y); yy <= Math.ceil(y + h); yy += 1) {
    for (let xx = Math.floor(x); xx <= Math.ceil(x + w); xx += 1) {
      const cx = Math.max(x + radius, Math.min(xx, x + w - radius));
      const cy = Math.max(y + radius, Math.min(yy, y + h - radius));
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= radius * radius) blendPixel(canvas, xx, yy, color, alpha);
    }
  }
}

function verticalGradient(canvas, top, bottom, alpha = 1) {
  const topColor = hex(top);
  const bottomColor = hex(bottom);
  for (let y = 0; y < canvas.height; y += 1) {
    const t = y / Math.max(1, canvas.height - 1);
    const color = [
      Math.round(topColor[0] + (bottomColor[0] - topColor[0]) * t),
      Math.round(topColor[1] + (bottomColor[1] - topColor[1]) * t),
      Math.round(topColor[2] + (bottomColor[2] - topColor[2]) * t),
    ];
    for (let x = 0; x < canvas.width; x += 1) blendPixel(canvas, x, y, color, alpha);
  }
}

function sparkle(canvas, cx, cy, r, color, alpha = 1) {
  polygon(
    canvas,
    [
      [cx, cy - r],
      [cx + r * 0.28, cy - r * 0.28],
      [cx + r, cy],
      [cx + r * 0.28, cy + r * 0.28],
      [cx, cy + r],
      [cx - r * 0.28, cy + r * 0.28],
      [cx - r, cy],
      [cx - r * 0.28, cy - r * 0.28],
    ],
    color,
    alpha,
  );
}

function downsample(canvas, factor) {
  const width = Math.round(canvas.width / factor);
  const height = Math.round(canvas.height / factor);
  const out = makeCanvas(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const i = ((y * factor + sy) * canvas.width + (x * factor + sx)) * 4;
          const alpha = canvas.data[i + 3] / 255;
          r += canvas.data[i] * alpha;
          g += canvas.data[i + 1] * alpha;
          b += canvas.data[i + 2] * alpha;
          a += alpha;
          count += 1;
        }
      }
      const oi = (y * width + x) * 4;
      const avgA = a / count;
      out.data[oi] = avgA > 0 ? Math.round(r / count / avgA) : 0;
      out.data[oi + 1] = avgA > 0 ? Math.round(g / count / avgA) : 0;
      out.data[oi + 2] = avgA > 0 ? Math.round(b / count / avgA) : 0;
      out.data[oi + 3] = Math.round(avgA * 255);
    }
  }
  return out;
}

// ------------------------------------------------------------------- art

const SKY = { top: '#5FD0FF', bottom: '#DDF6FF' };
const DINO = {
  body: '#57C87A',
  bodyDark: '#2C8C4F',
  belly: '#FFF0C2',
  accent: '#1F6B3B',
  eye: '#17263D',
  glow: '#B8FF7A',
};

/** Draws the EvoABC mascot in its own 120x120 space, scaled onto a canvas. */
function drawDino(canvas, offsetX, offsetY, scale, palette = DINO) {
  const c = {
    body: hex(palette.body),
    dark: hex(palette.bodyDark),
    belly: hex(palette.belly),
    accent: hex(palette.accent),
    eye: hex(palette.eye),
    glow: hex(palette.glow),
  };
  const T = (x, y) => [offsetX + x * scale, offsetY + y * scale];
  const S = (value) => value * scale;
  const pt = (list) => list.map(([x, y]) => T(x, y));

  // tail
  polygon(canvas, pt([[36, 78], [20, 78], [8, 70], [2, 56], [14, 60], [26, 62], [38, 66]]), c.dark);
  // back spikes
  for (const [x, y, h] of [[32, 58, 9], [42, 50, 10], [52, 44, 10]]) {
    polygon(canvas, pt([[x, y - h], [x - h * 0.7, y], [x + h * 0.7, y]]), c.accent);
  }
  // legs
  const [lx1, ly1] = T(44, 84);
  roundRect(canvas, lx1, ly1, S(15), S(26), S(7.5), c.dark);
  const [lx2, ly2] = T(62, 84);
  roundRect(canvas, lx2, ly2, S(15), S(26), S(7.5), c.body);
  // feet
  const [f1x, f1y] = T(51, 110);
  ellipse(canvas, f1x, f1y, S(11), S(5.4), c.dark);
  const [f2x, f2y] = T(70, 110);
  ellipse(canvas, f2x, f2y, S(11), S(5.4), c.body);
  // body and belly
  const [bx, by] = T(58, 68);
  ellipse(canvas, bx, by, S(27), S(26), c.body);
  const [bex, bey] = T(58, 78);
  ellipse(canvas, bex, bey, S(18), S(15), c.belly);
  // neck, arm, claws
  const [nx, ny] = T(60, 44);
  roundRect(canvas, nx, ny, S(20), S(24), S(10), c.body);
  const [ax, ay] = T(66, 68);
  roundRect(canvas, ax, ay, S(14), S(8), S(4), c.dark);
  polygon(canvas, pt([[78, 71], [84, 71], [82, 77]]), c.accent);
  // head
  const [hx, hy] = T(84, 42);
  ellipse(canvas, hx, hy, S(21), S(17), c.body);
  const [sx, sy] = T(92, 52);
  ellipse(canvas, sx, sy, S(16), S(8), c.belly);
  for (let i = 0; i < 5; i += 1) {
    polygon(canvas, pt([[86 + i * 5.4, 49], [90.2 + i * 5.4, 49], [88.1 + i * 5.4, 53.4]]), hex('#FFFFFF'));
  }
  // eye
  const [ex, ey] = T(90, 38);
  ellipse(canvas, ex, ey, S(5.6), S(5.6), hex('#FFFFFF'));
  const [px, py] = T(90.4, 38.4);
  ellipse(canvas, px, py, S(2.9), S(2.9), c.eye);
  const [gx, gy] = T(88.4, 36.1);
  ellipse(canvas, gx, gy, S(1.5), S(1.5), hex('#FFFFFF'));
  // nostril
  const [nox, noy] = T(100, 49);
  ellipse(canvas, nox, noy, S(1.1), S(1.1), c.eye, 0.8);
}

function drawGround(canvas, width, height) {
  ellipse(canvas, width * 0.2, height * 1.02, width * 0.62, height * 0.2, hex('#7BE495'), 0.95);
  ellipse(canvas, width * 0.86, height * 1.05, width * 0.7, height * 0.22, hex('#3DDC84'), 0.95);
  ellipse(canvas, width * 0.5, height * 1.12, width * 0.9, height * 0.16, hex('#22A75D'), 0.9);
}

function drawBackdrop(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  verticalGradient(canvas, SKY.top, SKY.bottom);
  ellipse(canvas, width * 0.16, height * 0.15, width * 0.13, width * 0.13, hex('#FFE07A'));
  ellipse(canvas, width * 0.16, height * 0.15, width * 0.2, width * 0.2, hex('#FFE07A'), 0.22);
  ellipse(canvas, width * 0.78, height * 0.1, width * 0.14, width * 0.055, hex('#FFFFFF'), 0.75);
  ellipse(canvas, width * 0.9, height * 0.16, width * 0.1, width * 0.045, hex('#FFFFFF'), 0.6);
  sparkle(canvas, width * 0.82, height * 0.3, width * 0.035, hex('#FFFFFF'), 0.9);
  sparkle(canvas, width * 0.12, height * 0.42, width * 0.026, hex('#FFE07A'), 0.95);
  drawGround(canvas, width, height);
}

function iconCanvas(size) {
  const canvas = makeCanvas(size * SS, size * SS);
  drawBackdrop(canvas);
  const unit = (size * SS * 0.8) / 120;
  drawDino(canvas, size * SS * 0.1, size * SS * 0.08, unit);
  return downsample(canvas, SS);
}

function adaptiveCanvas(size) {
  const canvas = makeCanvas(size * SS, size * SS);
  const unit = (size * SS * 0.62) / 120;
  drawDino(canvas, size * SS * 0.19, size * SS * 0.19, unit);
  return downsample(canvas, SS);
}

/** Rotates a list of points around a pivot, used for the broken egg cap. */
function rotatePoints(points, cx, cy, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
}

/** A zig zag rim across the top edge of the bowl. */
function zigzagEdge(left, right, y, amplitude, steps = 8) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = left + ((right - left) * i) / steps;
    points.push([x, y + (i % 2 === 0 ? -amplitude : amplitude * 0.55)]);
  }
  return points;
}

/** Half of an ellipse, used to close the bowl and the egg cap. */
function halfEllipse(cx, cy, rx, ry, lower) {
  const points = [];
  const steps = 26;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI;
    points.push([cx + Math.cos(angle) * rx, cy + (lower ? 1 : -1) * Math.sin(angle) * ry]);
  }
  return points;
}

/**
 * Splash art: a hatchling standing in the bottom half of its cracked egg,
 * with the broken cap lying beside it. Drawn back to front: shadow, dino,
 * far shell pieces, then the bowl that hides the dino's legs.
 */
function splashCanvas(size) {
  const canvas = makeCanvas(size * SS, size * SS);
  const width = canvas.width;
  const height = canvas.height;
  const cx = width * 0.5;
  const groundY = height * 0.8;
  const shellRx = width * 0.27;
  const shellRy = height * 0.21;
  const rimY = groundY - shellRy;
  const eggColor = hex('#FFF6E5');
  const eggShade = hex('#EBD9B4');
  const spot = hex('#57C87A');

  ellipse(canvas, cx, groundY + height * 0.03, shellRx * 0.72, height * 0.035, hex('#0C2233'), 0.14);

  // Hatchling first, so the shell overlaps its lower body.
  const unit = (height * 0.5) / 120;
  drawDino(canvas, cx - unit * 58, rimY - unit * 78, unit);

  // The broken cap lying to the left of the bowl.
  const capCx = cx - shellRx * 1.16;
  const capCy = groundY - shellRy * 0.42;
  const cap = halfEllipse(capCx, capCy, shellRx * 0.66, shellRy * 0.78, false).concat(
    zigzagEdge(capCx + shellRx * 0.66, capCx - shellRx * 0.66, capCy + shellRy * 0.16, shellRy * 0.12, 5).reverse(),
  );
  polygon(canvas, rotatePoints(cap, capCx, capCy, -18), eggColor);
  polygon(
    canvas,
    rotatePoints(
      halfEllipse(capCx, capCy, shellRx * 0.44, shellRy * 0.5, false).map(([x, y]) => [x, y + shellRy * 0.08]),
      capCx,
      capCy,
      -18,
    ),
    eggShade,
    0.55,
  );

  // Small shell fragments on the ground.
  for (const [dx, dy, r] of [[-1.9, 0.02, 0.07], [1.75, 0.01, 0.055], [0.35, 0.03, 0.04]]) {
    polygon(canvas, rotatePoints([[0, -1], [1, 0.4], [-0.6, 0.9]], 0, 0, dx * 40).map(([x, y]) => [cx + x * shellRx * r * 4 + shellRx * dx * 0.1, groundY - shellRy * dy + y * shellRy * r * 2]), eggShade, 0.95);
  }

  // The bowl the hatchling is standing in, with a zig zag cracked rim.
  const bowl = zigzagEdge(cx - shellRx, cx + shellRx, rimY, shellRy * 0.16, 9).concat(halfEllipse(cx, rimY, shellRx, shellRy, true));
  polygon(canvas, bowl, eggColor);
  // Rim shading so the crack reads at a glance.
  polygon(
    canvas,
    zigzagEdge(cx - shellRx, cx + shellRx, rimY, shellRy * 0.16, 9).concat(
      zigzagEdge(cx + shellRx, cx - shellRx, rimY + shellRy * 0.16, shellRy * 0.1, 9),
    ),
    eggShade,
    0.6,
  );
  // Shell spots.
  for (const [dx, dy, r] of [[-0.52, 0.5, 0.1], [0.42, 0.66, 0.075], [-0.06, 0.8, 0.06]]) {
    ellipse(canvas, cx + shellRx * dx, rimY + shellRy * dy, shellRx * r, shellRx * r, spot, 0.85);
  }

  sparkle(canvas, width * 0.16, height * 0.2, width * 0.03, hex('#FFE07A'), 0.95);
  sparkle(canvas, width * 0.84, height * 0.26, width * 0.022, hex('#FFFFFF'), 0.9);
  sparkle(canvas, width * 0.74, height * 0.12, width * 0.016, hex('#B8FF7A'), 0.9);

  return downsample(canvas, SS);
}

// ------------------------------------------------------------------ write

fs.mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ['icon.png', iconCanvas(1024)],
  ['adaptive-icon.png', adaptiveCanvas(1024)],
  ['splash.png', splashCanvas(1024)],
  ['favicon.png', downsample(iconCanvas(1024), 16)],
];

for (const [name, canvas] of outputs) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, encodePNG(canvas));
  console.log(`wrote ${path.relative(process.cwd(), file)} (${canvas.width}x${canvas.height})`);
}
