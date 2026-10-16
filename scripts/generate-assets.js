/**
 * Generates every raster asset the app ships with: app icon, adaptive icon,
 * splash art and the favicon. Everything is drawn with plain math and encoded
 * as PNG with Node's zlib, so the project has no image toolchain to install.
 *
 * The three pieces are composed rather than cropped: the mascot is placed on a
 * horizon with headroom, side margins and a safe area that respects the iOS
 * squircle and the Android adaptive icon crop, and every shape is shaded with
 * a lighter top left and a darker bottom so the flat fill does not look like a
 * sticker. Curves are sampled from Catmull-Rom control points, which is what
 * lets the neck flow into the back instead of reading as stacked ovals.
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

// ------------------------------------------------------------------- raster

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

/**
 * Samples a closed Catmull-Rom spline through the control points and fills it.
 * Organic outlines (back, neck, shell) come out smooth instead of faceted.
 */
function smoothShape(canvas, points, color, alpha = 1, samples = 12) {
  const n = points.length;
  if (n < 3) {
    polygon(canvas, points, color, alpha);
    return;
  }
  const at = (index) => points[((index % n) + n) % n];
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < samples; s += 1) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  polygon(canvas, out, color, alpha);
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

/** Mixes two colours, so every shade is derived instead of hand picked. */
function mixHex(a, b, t) {
  const ca = hex(a);
  const cb = hex(b);
  const out = [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const lighten = (color, t) => mixHex(color, '#FFFFFF', t);
const darken = (color, t) => mixHex(color, '#0B1B2B', t);

/**
 * Darkens the corners so the eye lands on the mascot. The falloff starts well
 * inside the frame, which reads as depth rather than as a dirty edge.
 */
function vignette(canvas, color, strength = 0.2) {
  const c = hex(color);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxDistance = Math.hypot(cx, cy);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const d = Math.hypot(x - cx, y - cy) / maxDistance;
      const amount = Math.max(0, (d - 0.42) / 0.58);
      const alpha = strength * amount * amount;
      if (alpha > 0.002) blendPixel(canvas, x, y, c, alpha);
    }
  }
}

/** Soft contact shadow: a few nested ellipses instead of one hard oval. */
function softShadow(canvas, cx, cy, rx, ry, color, alpha = 0.22) {
  for (let ring = 3; ring >= 1; ring -= 1) {
    const spread = 1 + ring * 0.34;
    ellipse(canvas, cx, cy, rx * spread, ry * spread, color, (alpha * 0.4) / ring);
  }
  ellipse(canvas, cx, cy, rx, ry, color, alpha * 0.5);
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

const SKY = { top: '#4FC8FF', mid: '#A7E7FF', bottom: '#E8FAFF' };
const DINO = {
  body: '#57C87A',
  bodyDark: '#2C8C4F',
  belly: '#FFF0C2',
  accent: '#1F6B3B',
  eye: '#17263D',
  glow: '#B8FF7A',
};

const FEET_Y = 112; // ground the mascot stands on, in its own 120 space
const ART_LEFT = 2; // tail tip, excluding the optional tail club
const ART_RIGHT = 116; // front of the snout

/** Turns a palette into the plain colours the drawing helpers want. */
function paletteOf(palette) {
  return {
    body: palette.body,
    dark: palette.bodyDark,
    belly: palette.belly,
    accent: palette.accent,
    eye: palette.eye,
    glow: palette.glow,
    bodyLit: lighten(palette.body, 0.22),
    bodyShade: darken(palette.body, 0.2),
    darkShade: darken(palette.bodyDark, 0.22),
    bellyShade: darken(palette.belly, 0.12),
    claw: lighten(palette.belly, 0.55),
  };
}

const NO_TRAITS = {
  horns: false,
  armor: false,
  fins: false,
  wings: false,
  spikes: false,
  glowEyes: false,
  tailClub: false,
  longNeck: false,
};

/**
 * Draws the EvoABC mascot in its own 120x120 space, scaled onto a canvas.
 * Drawn back to front: wings and tail, far leg, body, near leg and arm, neck
 * and head, then the flourishes an evolution stage adds. `opts.stage` and
 * `opts.traits` decide how armoured the creature is.
 */
function drawDino(canvas, offsetX, offsetY, scale, palette = DINO, opts = {}) {
  const c = paletteOf(palette);
  const stage = opts.stage === undefined ? 2 : opts.stage;
  const traits = { ...NO_TRAITS, ...(opts.traits || {}) };
  const young = stage <= 0;
  const ly = traits.longNeck ? 9 : 0; // head lift for the long necked species
  const armoured = traits.armor || stage >= 2;
  const glowing = traits.fins || stage >= 3;
  const horned = traits.horns || stage >= 4;
  const T = (x, y) => [offsetX + x * scale, offsetY + y * scale];
  const P = (list) => list.map(([x, y]) => T(x, y));
  const S = (value) => value * scale;
  const fill = (points, color, alpha) => smoothShape(canvas, P(points), hex(color), alpha);
  const flat = (points, color, alpha) => polygon(canvas, P(points), hex(color), alpha);
  const oval = (cx, cy, rx, ry, color, alpha) => ellipse(canvas, ...T(cx, cy), S(rx), S(ry), hex(color), alpha);
  const bar = (x, y, w, h, r, color, alpha) => {
    const [bx, by] = T(x, y);
    roundRect(canvas, bx, by, S(w), S(h), S(r), hex(color), alpha);
  };
  /** One back spike, raked backwards so it looks like it grows from the ridge. */
  const spike = (x, y, h, color = c.accent, alpha = 1) => flat([[x - 1, y - h], [x - 4.4, y + 1], [x + 2.2, y + 1]], color, alpha);
  /** One foot: three toes at the front, each with a claw tip. */
  const foot = (cx, cy, rx, color) => {
    oval(cx, cy, rx, 5.6, color);
    for (const [dx, dy] of [[-0.62, 0.1], [-0.1, 0.42], [0.44, 0.3]]) {
      oval(cx + rx * dx, cy + rx * dy * 0.34, rx * 0.34, 3.1, color, 0.98);
      flat(
        [
          [cx + rx * dx - 1.6, cy + rx * dy * 0.34 + 0.6],
          [cx + rx * dx + 1.6, cy + rx * dy * 0.34 + 0.6],
          [cx + rx * dx - 0.2, cy + rx * dy * 0.34 + 4.4],
        ],
        c.claw,
        0.9,
      );
    }
  };

  // ---------------------------------------------------------------- behind
  if (traits.wings) {
    fill([[58, 52], [42, 28], [20, 18], [3, 25], [16, 38], [30, 52], [46, 62]], c.dark, 1);
    fill([[56, 52], [42, 32], [24, 24], [11, 29], [23, 39], [35, 50], [47, 59]], c.body, 0.94);
    fill([[55, 46], [34, 30], [13, 26], [11, 28.6], [33, 34], [54, 50]], c.darkShade, 0.5);
    fill([[52, 50], [34, 38], [16, 33], [14, 35.4], [33, 41], [51, 53]], c.darkShade, 0.4);
  }

  // Tail: a tapered ribbon that lifts off the ground instead of dragging.
  fill([[44, 58], [30, 51], [16, 45], [5, 39], [5, 48], [16, 58], [30, 68], [44, 80]], c.dark, 1);
  fill([[42, 62], [30, 56], [18, 50], [9, 45], [9, 51], [19, 59], [31, 67], [42, 74]], c.body, 0.92);
  if (traits.tailClub) {
    oval(7, 43, 9.5, 9.5, c.accent);
    oval(6, 41, 6.4, 6.2, lighten(palette.accent, 0.28), 0.5);
    spike(1.5, 35, 6.5, c.body);
    spike(13, 34, 6, c.body);
    spike(16, 46, 6, c.body);
  }

  // Even a hatchling has a ridge, it is simply lower: three nubs raked back.
  spike(48, 52, young ? 5.5 : 7.5);
  spike(58, 45, young ? 6.5 : 8.5);
  spike(68, 43, young ? 6 : 8);

  if (glowing) {
    for (const [x, y, h] of [[46, 53, 12], [58, 45, 14], [70, 44, 12.5]]) {
      oval(x - 1, y - h * 0.45, h * 0.5, h * 0.42, c.glow, 0.18);
      flat([[x, y - h], [x - 5.4, y + 1], [x + 3, y + 1]], c.accent);
      flat([[x, y - h * 0.7], [x - 2.8, y - 1.2], [x + 1.8, y - 1.2]], c.glow, 0.85);
    }
  }

  // Far leg, drawn darker so the near leg reads as being in front.
  bar(45, 88, 14, 20, 7, c.dark);
  oval(52, 86, 13, 15, c.dark);
  foot(52, 109, 12, c.dark);

  // ---------------------------------------------------------------- body
  fill([[46, 52], [62, 44], [78, 52], [86, 66], [84, 80], [72, 94], [54, 96], [42, 86], [38, 68]], c.dark, 1);
  fill([[48, 53], [63, 46], [78, 53], [85, 66], [83, 79], [71, 92], [55, 94], [44, 85], [40, 68]], c.body, 1);
  // Light from the top right, so the top left of the back picks up the highlight.
  fill([[49, 54], [62, 47], [77, 54], [82, 64], [74, 60], [60, 54], [50, 59]], c.bodyLit, 0.34);
  oval(50, 66, 7, 9, c.bodyLit, 0.16);
  oval(76, 86, 8, 7, c.bodyShade, 0.22);

  // Chest and belly panel: a rounded plate rather than a flat oval.
  fill([[56, 60], [70, 60], [79, 70], [76, 86], [62, 91], [51, 84], [48, 70]], c.belly, 0.97);
  fill([[58, 76], [70, 76], [76, 86], [62, 91], [51, 84]], c.bellyShade, 0.4);
  fill([[54, 62], [68, 61], [76, 68], [68, 64], [56, 66]], lighten(palette.belly, 0.5), 0.5);

  if (armoured) {
    for (const [x, y, w, h] of [[44, 52, 12.5, 20], [57, 45, 13, 22], [68, 46, 12, 20], [47, 79, 16, 13]]) {
      bar(x, y, w, h, w / 2.5, c.dark);
      bar(x + 1.2, y + 1.2, w - 2.4, h * 0.3, w / 3.6, lighten(palette.accent, 0.12), 0.75);
      bar(x + 1.2, y + 1.2, w * 0.32, h - 2.4, w / 4, lighten(palette.bodyDark, 0.35), 0.28);
    }
  }

  // ---------------------------------------------------------- near limbs
  bar(63, 88, 15, 20, 7.5, c.body);
  oval(70, 85, 15, 17, c.body);
  oval(67, 83, 10, 11, c.bodyLit, 0.2);
  foot(71, 109, 13, c.body);
  bar(79, 72, 12, 9, 4.5, c.dark);
  oval(84, 75, 8, 6, c.dark);
  oval(82, 72.5, 5.4, 3.6, lighten(palette.bodyDark, 0.22), 0.5);
  flat([[88, 71], [92, 68.4], [89.6, 74]], c.claw, 0.95);
  flat([[89, 76], [93, 74.6], [90, 79.6]], c.claw, 0.95);

  // ------------------------------------------------------- neck and head
  fill([[72, 52], [80, 42 - ly], [88, 36 - ly], [95, 41 - ly], [91, 52 - ly * 0.9], [79, 58], [73, 56]], c.body);
  fill([[74, 50], [81, 43 - ly], [87, 38 - ly], [91, 41 - ly], [85, 47 - ly], [77, 53]], c.bodyLit, 0.22);
  fill([[80, 38 - ly], [88, 27 - ly], [100, 27 - ly], [110, 37 - ly], [110, 48 - ly], [98, 54 - ly], [84, 51 - ly], [78, 43 - ly]], c.body);
  fill([[80, 37 - ly], [88, 28 - ly], [99, 28 - ly], [108, 37 - ly], [98, 36 - ly], [86, 34 - ly], [81, 40 - ly]], c.bodyLit, 0.26);
  fill([[84, 50 - ly], [98, 50 - ly], [108, 46 - ly], [108, 50 - ly], [98, 55 - ly], [86, 53 - ly]], c.bodyShade, 0.3);

  // Jaw and snout, with the teeth sitting on the lip line.
  fill([[94, 50 - ly], [110, 44 - ly], [111, 48.6 - ly], [103, 54 - ly], [93, 53 - ly]], c.belly);
  fill([[94, 50 - ly], [108, 45 - ly], [109, 47 - ly], [100, 51 - ly]], lighten(palette.belly, 0.45), 0.55);
  for (let i = 0; i < 4; i += 1) {
    flat([[92 + i * 5, 49.4 - ly], [96.2 + i * 5, 49.4 - ly], [94.1 + i * 5, 53.6 - ly]], '#FFFFFF');
  }
  oval(105, 39 - ly, 1.5, 1.2, darken(palette.body, 0.5), 0.8);
  oval(92, 28.6 - ly, 10, 5, lighten(palette.body, 0.55), 0.3);

  if (traits.glowEyes) oval(92, 37 - ly, 12, 12, c.glow, 0.26);
  oval(92, 37 - ly, 7.8, 8.2, '#FFFFFF');
  oval(93.6, 38 - ly, 4.8, 5, c.eye);
  oval(91, 34.8 - ly, 2, 2, '#FFFFFF', 0.95);
  oval(95.6, 40.8 - ly, 1.2, 1.2, '#FFFFFF', 0.55);
  fill([[86, 30 - ly], [92, 27 - ly], [99, 30 - ly], [98, 32.8 - ly], [92, 29.8 - ly], [87, 32.6 - ly]], darken(palette.body, 0.42), 0.72);
  // A soft cheek and a second brow, so the face reads friendly rather than blank.
  oval(99, 45 - ly, 3.6, 2.4, darken(palette.belly, 0.06), 0.35);

  if (horned) {
    flat([[84, 27 - ly], [80, 12 - ly], [90, 25 - ly]], c.accent);
    flat([[86, 26 - ly], [83, 15 - ly], [89, 24 - ly]], lighten(palette.accent, 0.35), 0.6);
    flat([[99, 26 - ly], [102, 10 - ly], [107, 27 - ly]], c.accent);
    flat([[100.5, 25 - ly], [102.4, 14 - ly], [105.4, 25 - ly]], lighten(palette.accent, 0.35), 0.6);
  }
}

function drawGround(canvas, horizon = 0.78) {
  const width = canvas.width;
  const height = canvas.height;
  // Far hills, then three bands of ground, so the horizon has depth.
  ellipse(canvas, width * 0.26, height * horizon + height * 0.02, width * 0.42, height * 0.13, hex('#93E9A8'), 0.5);
  ellipse(canvas, width * 0.78, height * horizon + height * 0.04, width * 0.4, height * 0.11, hex('#7BE495'), 0.45);
  ellipse(canvas, width * 0.2, height * 1.02, width * 0.66, height * 0.2, hex('#8CEBA4'), 0.95);
  ellipse(canvas, width * 0.88, height * 1.05, width * 0.74, height * 0.22, hex('#5EDC8B'), 0.95);
  ellipse(canvas, width * 0.5, height * 1.14, width * 0.96, height * 0.17, hex('#2FAE68'), 0.92);
}

function drawBackdrop(canvas, options = {}) {
  const width = canvas.width;
  const height = canvas.height;
  // The sun is the mascot's backdrop, not the subject, so a small canvas such
  // as the Android icon can ask for a smaller one.
  const sun = options.sunScale === undefined ? 1 : options.sunScale;
  verticalGradient(canvas, SKY.top, SKY.bottom);
  // A warm band across the sky keeps the top third from looking empty.
  ellipse(canvas, width * 0.5, height * 0.62, width * 0.8, height * 0.3, hex('#FFF3CF'), 0.28);

  ellipse(canvas, width * 0.17, height * 0.145, width * 0.145 * sun, width * 0.145 * sun, hex('#FFE07A'));
  ellipse(canvas, width * 0.17, height * 0.145, width * 0.23 * sun, width * 0.23 * sun, hex('#FFE07A'), 0.2);

  // Two clouds, each a pair of overlapping ellipses so the edge is not a blob.
  ellipse(canvas, width * 0.76, height * 0.11, width * 0.15, width * 0.062, hex('#FFFFFF'), 0.82);
  ellipse(canvas, width * 0.86, height * 0.135, width * 0.11, width * 0.05, hex('#FFFFFF'), 0.72);
  ellipse(canvas, width * 0.68, height * 0.145, width * 0.09, width * 0.042, hex('#FFFFFF'), 0.6);
  ellipse(canvas, width * 0.12, height * 0.33, width * 0.08, width * 0.036, hex('#FFFFFF'), 0.5);

  sparkle(canvas, width * 0.84, height * 0.28, width * 0.032, hex('#FFFFFF'), 0.9);
  sparkle(canvas, width * 0.06, height * 0.44, width * 0.022, hex('#FFE07A'), 0.9);

  drawGround(canvas, options.horizon === undefined ? 0.78 : options.horizon);
  vignette(canvas, '#0C2233', options.vignette === undefined ? 0.2 : options.vignette);
}

/** Places the mascot so its feet land on the horizon, centred and in proportion. */
function placeMascot(canvas, scaleFactor, horizon, palette, opts) {
  const width = canvas.width;
  const height = canvas.height;
  const artWidth = ART_RIGHT - ART_LEFT + 4;
  const unit = (width * scaleFactor) / artWidth;
  const feetY = height * horizon;
  const offsetX = (width - 120 * unit) / 2;
  const offsetY = feetY - FEET_Y * unit;
  softShadow(canvas, width * 0.52, feetY + unit * 2, 30 * unit, 7 * unit, hex('#0C2233'), 0.24);
  drawDino(canvas, offsetX, offsetY, unit, palette, opts);
}

function iconCanvas(size) {
  const canvas = makeCanvas(size * SS, size * SS);
  drawBackdrop(canvas, { horizon: 0.8 });
  // 70 percent of the frame, which still leaves a 15 percent margin on both
  // sides: well clear of the 8 percent iOS keeps free, and of the squircle.
  placeMascot(canvas, 0.7, 0.8, DINO, { stage: 2 });
  return downsample(canvas, SS);
}

function adaptiveCanvas(size) {
  const canvas = makeCanvas(size * SS, size * SS);
  drawBackdrop(canvas, { horizon: 0.74, vignette: 0.16, sunScale: 0.8 });
  // Android crops the outer ring away, so the mascot is sized to the circle it
  // actually shows rather than to a corner of the square. At 44 percent of the
  // frame the dinosaur read as a speck on the home screen: the creature is
  // about four fifths as tall as it is wide, so it can be half the frame and
  // still sit inside that circle.
  placeMascot(canvas, 0.52, 0.72, DINO, { stage: 2 });
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
 * Splash art: a hatchling standing in the bottom half of its cracked egg, with
 * the broken cap lying beside it. The shell is shaded so the crack reads at a
 * glance, and there is nothing floating in the air behind it.
 */
function splashCanvas(size) {
  const canvas = makeCanvas(size * SS, size * SS);
  const width = canvas.width;
  const height = canvas.height;
  const cx = width * 0.5;
  const groundY = height * 0.86;
  const shellRx = width * 0.3;
  const shellRy = height * 0.2;
  const rimY = groundY - shellRy;
  const eggColor = '#FFF6E5';
  const eggShade = '#E4CFA6';
  const spot = '#57C87A';
  const horizon = rimY / height;

  // A calmer sky than the icon: fewer clouds, one sun, no specks.
  verticalGradient(canvas, '#63D3FF', '#EAF9FF');
  ellipse(canvas, width * 0.5, height * 0.7, width * 0.78, height * 0.26, hex('#FFF3CF'), 0.26);
  ellipse(canvas, width * 0.79, height * 0.16, width * 0.12, width * 0.12, hex('#FFE07A'));
  ellipse(canvas, width * 0.79, height * 0.16, width * 0.19, width * 0.19, hex('#FFE07A'), 0.2);
  ellipse(canvas, width * 0.17, height * 0.13, width * 0.13, width * 0.05, hex('#FFFFFF'), 0.7);
  ellipse(canvas, width * 0.08, height * 0.16, width * 0.09, width * 0.04, hex('#FFFFFF'), 0.6);
  drawGround(canvas, horizon);
  vignette(canvas, '#0C2233', 0.16);

  softShadow(canvas, cx, groundY + height * 0.02, shellRx * 0.8, height * 0.03, hex('#0C2233'), 0.2);

  // Hatchling first, so the shell overlaps its legs: a young, lighter coloured
  // dinosaur with the long tail folded down and no armour at all.
  const hatchling = {
    body: lighten(DINO.body, 0.14),
    bodyDark: lighten(DINO.bodyDark, 0.16),
    belly: lighten(DINO.belly, 0.3),
    accent: lighten(DINO.accent, 0.12),
    eye: DINO.eye,
    glow: DINO.glow,
  };
  const artWidth = ART_RIGHT - ART_LEFT + 4;
  const unit = (width * 0.44) / artWidth;
  const feetY = rimY + shellRy * 0.66;
  drawDino(canvas, (width - 120 * unit) / 2, feetY - FEET_Y * unit, unit, hatchling, { stage: 0 });

  // The broken cap lying to the left of the bowl, its crack facing the shell.
  const capCx = cx - shellRx * 1.22;
  const capCy = groundY - shellRy * 0.5;
  const cap = halfEllipse(capCx, capCy, shellRx * 0.62, shellRy * 0.74, false).concat(
    zigzagEdge(capCx + shellRx * 0.62, capCx - shellRx * 0.62, capCy + shellRy * 0.14, shellRy * 0.14, 6).reverse(),
  );
  polygon(canvas, rotatePoints(cap, capCx, capCy, -16), hex(eggColor));
  polygon(canvas, rotatePoints(halfEllipse(capCx - shellRx * 0.12, capCy + shellRy * 0.05, shellRx * 0.34, shellRy * 0.44, false), capCx, capCy, -16), hex(eggShade), 0.4);
  ellipse(canvas, capCx + shellRx * 0.16, capCy - shellRy * 0.34, shellRx * 0.07, shellRx * 0.07, hex(spot), 0.8);

  // The bowl the hatchling stands in, with a zig zag cracked rim.
  const bowl = zigzagEdge(cx - shellRx, cx + shellRx, rimY, shellRy * 0.17, 9).concat(halfEllipse(cx, rimY, shellRx, shellRy, true));
  polygon(canvas, bowl, hex(eggColor));
  // A lighter band just under the rim, then a shade band, so the thickness of
  // the shell shows and the crack is legible even at favicon size.
  polygon(
    canvas,
    zigzagEdge(cx - shellRx, cx + shellRx, rimY + shellRy * 0.04, shellRy * 0.15, 9).concat(
      zigzagEdge(cx + shellRx, cx - shellRx, rimY + shellRy * 0.2, shellRy * 0.12, 9),
    ),
    hex(lighten(eggColor, 0.6)),
    0.75,
  );
  polygon(
    canvas,
    zigzagEdge(cx - shellRx, cx + shellRx, rimY, shellRy * 0.17, 9).concat(
      zigzagEdge(cx + shellRx, cx - shellRx, rimY + shellRy * 0.13, shellRy * 0.11, 9),
    ),
    hex(eggShade),
    0.55,
  );
  ellipse(canvas, cx + shellRx * 0.66, rimY + shellRy * 0.55, shellRx * 0.2, shellRy * 0.34, hex(eggShade), 0.28);
  for (const [dx, dy, r] of [[-0.46, 0.52, 0.1], [0.36, 0.68, 0.075], [-0.04, 0.84, 0.055]]) {
    ellipse(canvas, cx + shellRx * dx, rimY + shellRy * dy, shellRx * r, shellRx * r, hex(spot), 0.8);
    ellipse(canvas, cx + shellRx * dx, rimY + shellRy * dy - shellRx * r * 0.25, shellRx * r * 0.5, shellRx * r * 0.4, hex(lighten(spot, 0.45)), 0.5);
  }

  // Two soft glints in the sky, placed so they do not sit behind the shell.
  sparkle(canvas, width * 0.14, height * 0.24, width * 0.026, hex('#FFFFFF'), 0.8);
  sparkle(canvas, width * 0.88, height * 0.33, width * 0.02, hex('#FFE07A'), 0.85);

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
